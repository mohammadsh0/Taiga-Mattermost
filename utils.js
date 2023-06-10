const http = require('http');


// Handle http requests and returns the data
function httpRequester(url, options, payload='', needHeaders=false) {
    let data = '';
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (resp) => {
            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                if (needHeaders) {
                    resolve([data, resp.headers]);
                }
                resolve(data);
            })
        })
        req.on("error", (err) => {
            console.error(`Error: ${err.message}`);
        });
        if (payload) req.write(payload);
        req.end();
    })
}

// Makes options for passing into http.request()
function options(method, authorization, taiga=false) {
    const Authorization = taiga ? `bearer ${authorization}` : `Bearer ${authorization}`;

    if (authorization) {
        return {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: Authorization
            }
        }
    } else {
        return {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        }
    }
}

function objInArray(someObj, objArray) {
    let isInArray = false;
    objArray.forEach((obj) => {
        if (JSON.stringify(obj) === JSON.stringify(someObj)) {
            isInArray = true;
        }
    })
    return isInArray;
}

module.exports.options = options;
module.exports.httpRequester = httpRequester;
module.exports.objInArray = objInArray;