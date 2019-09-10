/* exported parseArgs */

const parseArgs = function () {
    const args = {};
    if (window.location.href.indexOf("?") < 0) {
        return args;
    }
    const paramList = window.location.href.split("?")[1].split("&");
    for (let i = 0; i < paramList.length; i++) {
        const key = paramList[i].split("=")[0];
        const value = paramList[i].split("=")[1];
        args[key] = value;
    }
    return args;
};