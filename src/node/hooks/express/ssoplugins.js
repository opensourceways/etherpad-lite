'use strict';

const {Issuer} = require('openid-client');
const {URL} = require("url");

let oidcClient = null;
const ep = (endpoint) => `/ep_openid_connect/${endpoint}`;
const endpointUrl = (endpoint) => new URL(ep(endpoint).substr(1), process.env.ISSUER_BASE_URL).toString();


const getIssue = async () => {
    return new Issuer()
}

const getResp = async (ygToken, token) => {
    if (oidcClient === null) {
        oidcClient = new (await getIssue()).Client({
                client_id: process.env.ISSUER_CLIENT_ID,
                client_secret: process.env.ISSUER_CLIENT_SECRET,
                response_types: ['code'],
                redirect_uris: [endpointUrl('callback')],
            }
        );
    }
    return await oidcClient.checkToken(ygToken, token);
}

const _syncRespCookies = (oldResp, newResp) => {
    if (oldResp.headers["set-cookie"]) {
        newResp.setHeader("set-cookie", oldResp.headers["set-cookie"])
    }
}

exports.checkSsoToken = async (req, res) => {
    let token = req.cookies._U_T_;
    if (token !== undefined && token !== "") {
        let resp = await getResp(req.cookies._Y_G_, token)
        if (resp.statusCode === 200) {
            _syncRespCookies(resp, res);
            let data = JSON.parse(resp.body);
            req.session.user.displayname = data.data.username;
            req.session.user.username = data.data.username;
            req.session.user.readOnly = false;
        } else {
            req.session.user.displayname = "Read-Only Guest";
            req.session.user.username = "guest";
            req.session.user.readOnly = true;
        }
    } else {
        req.session.user.displayname = "Read-Only Guest";
        req.session.user.username = "guest";
        req.session.user.readOnly = true;
    }
}
