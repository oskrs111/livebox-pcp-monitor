const fs = require('fs');
let moment = require('moment');
let config = require('./config.json');
let parser = require('node-html-parser');
let request = require('request');
let _cookies = [];
let _taskerState = '';
let _pcpList = [];
debugger;
_setMonitor();
_setTasker('login');
_tasker();

//-------------------------------------------------------------------------------------------------------
let _eval = '';
let _options = {};

function _tasker() {
    switch (_taskerState) {
        case 'idle':
            break;

        case 'login':
            _logWrite('Monitoring start...');
            request.post(`http://${config.livebox.ip}/cgi-bin/login.exe`,
                    function(err, response, body) {
                        if ((response.statusCode == 302) && (response.headers['set-cookie'].length > 0)) {
                            _cookies = response.headers['set-cookie'][0].split(';');
                            _setTasker('pcpRead');
                            console.log('_tasker("login")', _cookies);
                        } else {
                            _logWrite('error: ' + JSON.stringify(response));
                        }
                    })
                .form({ user: `${config.livebox.username}`, pws: `${config.livebox.password}` });
            _setTasker('wait');
            break;

        case 'login2':
            _logWrite('Monitoring start...');
            request.post(`http://${config.livebox.ip}/cgi-bin/login.exe`,
                    function(err, response, body) {
                        if ((response.statusCode == 302) && (response.headers['set-cookie'].length > 0)) {
                            _cookies = response.headers['set-cookie'][0].split(';');
                            _setTasker('pcpSet');
                            console.log('_tasker("login2")', _cookies);
                        } else {
                            _logWrite('error: ' + JSON.stringify(response));
                        }
                    })
                .form({ user: `${config.livebox.username}`, pws: `${config.livebox.password}` });
            _setTasker('wait');
            break;

        case 'logout':
            _logWrite('End.');
            request.post(`http://${config.livebox.ip}/cgi-bin/logout.exe`,
                    function(err, response, body) {
                        if (response.statusCode == 403) {
                            console.log('_tasker("logout") >>> END!');
                            _setTasker('idle');
                        }
                    })
                .form({ user: `${config.livebox.username}`, pws: `${config.livebox.password}` });
            _setTasker('wait');
            break;

        case 'pcpRead':
            _options = {
                url: `http://${config.livebox.ip}/pcp_cl.stm`,
                headers: {
                    'Cookie': _cookies[0],
                    'Referer': `http://${config.livebox.ip}/menu.stm`
                }
            };
            request(_options,
                function(err, response, body) {
                    _eval = _pcpParse(body);
                    _setTasker('pcpEvaluate');
                });
            _setTasker('wait');
            break;

        case 'pcpEvaluate':
            console.log('_tasker("pcpEvaluate#0")', _eval);
            eval(_eval);
            let _index = portfwd_list.length;
            let _update = 0;
            _pcpList = JSON.parse(JSON.stringify(config.pcp));
            console.log('_tasker("pcpEvaluate#1") => portfwd_list= ', portfwd_list);
            console.log('_tasker("pcpEvaluate#1.1") => _pcpList=', _pcpList);
            for (let _i in _pcpList) {
                _pcpList[_i].update = true;
                _pcpList[_i].index = _index++;
                _update++;
                for (let _p of portfwd_list) {
                    if ((_pcpList[_i].publicPort == _p.pubPort) &&
                        (_pcpList[_i].internalPort == _p.InPort) &&
                        (_pcpList[_i].internalIp == _p.inIP)) {
                        _pcpList[_i].update = false;
                        _update--;
                        console.log('_tasker("pcpEvaluate#2") >>> SKIP:', _pcpList[_i]);
                        break;
                    }
                }
            }

            if (_update == 0) {
                console.log('_tasker("pcpSet#1") >>> NOTHING TO UPDATE');
                _logWrite('Nothing to update.');
                _setTasker('logout');
            } else {
                console.log('_tasker("pcpEvaluate#3")', _pcpList);
                //_setTasker('pcpSet');
                _setTasker('doReset');
            }
            break;

        case 'doReset':
            data = {};
            data.page = 'active';
            data.logout = ' ';

            _options = {
                method: 'POST',
                url: `http://${config.livebox.ip}/cgi-bin/restart.exe`,
                headers: {
                    'Cookie': _cookies[0],
                    'Origin': config.livebox.ip
                }
            };

            console.log('_tasker("reset#1") >>> SEND', data);
            request(_options,
                function(err, response, body) {
                    if (response.statusCode == 302) {
                        setTimeout(() => {
                            _setTasker('login2');
                        }, config.application.resetWait);
                    } else {
                        _logWrite('error: ' + JSON.stringify(response));
                    }
                }).form(data);
            _setTasker('wait');
            _logWrite('Setting: ' + JSON.stringify(data));
            break;

        case 'pcpSet':
            data = {};
            for (let _i of _pcpList) {
                if (_i.update == true) {
                    data.action = 'active';
                    data.index = _i.index;
                    data.extern_port = '';
                    data.proto_t = '';
                    data.internal_port = '';
                    data.in_ip = '';
                    data.p_port = _i.publicPort;
                    data.proto = _getProto(_i.protocol);
                    data.i_ip = _i.internalIp;
                    data.in_port = _i.internalPort;
                    data.prop = _i.proposeAllow;
                    break;
                }
            }

            if (data.action == undefined) {
                console.log('_tasker("pcpSet#1") >>> UPDATE END');
                _setTasker('logout');
                break;
            }

            _options = {
                method: 'POST',
                url: `http://${config.livebox.ip}/cgi-bin/pcp.cgi`,
                headers: {
                    'Cookie': _cookies[0],
                    'Origin': config.livebox.ip,
                    'Connection': 'keep-alive'
                }
            };

            console.log('_tasker("pcpSet#2") >>> SEND', data);
            request(_options,
                function(err, response, body) {
                    if (response.statusCode == 302) {
                        _pcpList.shift();
                        setTimeout(() => {
                            _setTasker('pcpSet');
                        }, config.application.writeInterval);
                    } else {
                        _logWrite('error: ' + JSON.stringify(response));
                    }
                }).form(data);
            _setTasker('wait');
            _logWrite('Setting: ' + JSON.stringify(data));
            break;

        case 'wait':
            break;

    }
    setTimeout(() => { _tasker(); }, 500);
}

function _setTasker(state) {
    _taskerState = state;
    console.log('_setTasker(state)', state);
}

function _setMonitor() {
    config.application.writeInterval = config.application.writeInterval * 1000;
    config.application.resetWait = config.application.resetWait * 1000;

    setInterval(() => {
        _setTasker('login');
    }, config.application.monitorInterval * 1000);
}

function _pcpParse(body) {
    let options = {
        lowerCaseTagName: false,
        script: true,
        style: false,
        pre: false
    };

    let _o = parser.parse(body, options);
    //console.log('_tasker("login")', _o.querySelectorAll('script'));
    for (let _s of _o.querySelectorAll('script')) {
        if (_s.rawAttrs.indexOf('src') > 0) continue;
        else {
            let _l = _s.innerHTML.split(';\n');
            let _state = 0;
            let _code = '';
            let _end = false;
            for (let _t of _l) {
                switch (_state) {
                    case 0:
                        if (_t.indexOf('portfwd_list') >= 0) {
                            _code += _t + ';\n';
                            _state++;
                            //console.log('_tasker("pcpRead#1")',_t);
                        }
                        break;

                    case 1:
                        if (_t.indexOf('function') >= 0) {
                            _end = true;
                        } else if (_t.indexOf('portfwd_list') >= 0) {
                            _code += _t + ';\n';
                            //console.log('_tasker("pcpRead#2")',_t);
                        }
                        break;
                }
                if (_end == true) break;
            }

            console.log('_tasker("pcpRead#3")', _code);
            return _code;
        }
    }
}

function _getProto(type) {
    switch (type.toUpperCase()) {
        case "UDP":
            return 17;

        case "TCP":
        default:
            return 6;

    }
}

function _logWrite(line) {
    if (config.application.logEnable != true) return;
    let _line = `${moment().format()}; ${line};\r\n`;
    fs.appendFile(`${__dirname}/updates.log`, _line, function(err) {
        if (err) {
            console.log('_logWrite(error)', error);
        }
    });
}