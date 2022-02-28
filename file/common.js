const express = require('express');
const knex = require('../knexfile');
const secure = require('bcrypt');
const { dashLogger } = require('../logger'); //for winston error logging

const path = require("path")
const fs = require("fs")



function error_return(msg) {
    return {
        Code: 0,
        Message: msg
    };
}

function error_log_return(error, header_req) {

    dashLogger.error(`Error Message : ${error}; Originating URL : ${header_req.originalUrl}; Date: ${new Date()}`);

    //can save to error db if need be or call a dev notifier 

    return {
        Code: 0,
        Message: "Operational error. Please try again later as we fix the error"
    };
}


function success_return(msg, data = []) {
    return {
        Code: 1,
        Message: msg,
        Data: data
    };
}



function GenerateCode(size) {
    let charr = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    let charr_length = charr.length;

    let res1 = "";
    for (let i = 0; i < size; i++) {
        res1 += charr.charAt(Math.floor(Math.random() * charr_length));
    }

    return res1;
}

async function GenerateEncryptedPassword(password, no = 10) {
    let hash = await secure.hash(password, no); //hashSync
    return hash;
}
async function VerifyEncryptedPassword(password1, hash1) {
    let isMatch = await secure.compare(password1, hash1);
    return isMatch;
}


module.exports = {
    error_return, error_log_return, success_return, GenerateCode, GenerateEncryptedPassword, VerifyEncryptedPassword
}