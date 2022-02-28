
const express = require('express');
const knex = require('../knexfile');
const common = require('../file/common');
const jwt = require('../file/jwt');
const router = express.Router();
//const { raw, ref } = require('objection');


//Interest: Lotto or Betting


//FUNCTIONS
async function GetFeeds(str) {
    if (str == "All") {
        const [rows, fields] = await knex.raw("Select a.subject, a.detail, a.interest, concat(b.firstname,' ',b.lastname) as postedby, date_format(a.datecreated, '%d-%b-%Y %h:%i:%s%p') as dateposted from betchat_feeds a left join betchat_users b on b.id=a.userid order by a.id desc");
        return rows;
    } else {
        const [rows, fields] = await knex.raw("Select a.subject, a.detail, a.interest, concat(b.firstname,' ',b.lastname) as postedby, date_format(a.datecreated, '%d-%b-%Y %h:%i:%s%p') as dateposted from betchat_feeds a left join betchat_users b on b.id=a.userid where a.interest=? order by a.id desc", [str]);
        return rows;
    }
}

async function GetProfile(_id) {
    const [rows, fields] = await knex.raw("Select firstname, lastname, email, phoneno, address, interest, date_format(datecreated, '%d-%b-%Y %h:%i:%s%p') as dateregistered from betchat_users where id=?", [_id]);

    return rows;
}





/**
 * @swagger
 * /user/signup:
 *  post:
 *    summary: Signup to the betchat platform. (NB. interest can only be Lotto or Betting)
 *    tags:
 *      - User
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              firstname:
 *                type: string
 *              lastname:
 *                type: string
 *              phoneno:
 *                type: string
 *              address:
 *                type: string
 *              email:
 *                type: string
 *              interest:
 *                type: string
 *              confirmpassword:
 *                type: string
 *              password:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Ok
 */
router.route('/user/signup').post(async (req, res, next) => {

    try {
        let { firstname, lastname, phoneno, email, address, interest, password, confirmpassword } = req.body;

        if (firstname != "" && lastname != "" && phoneno != "" && email != "" && address != "" && interest != "") {
            if (interest == "Lotto" || interest == "Betting") {
                if (password != "" && (password === confirmpassword)) {

                    let dup = await knex("betchat_users").select("*").where("email", email).first();

                    if (dup != null) {
                        res.status(200).json(common.error_return("The email entered already exist"));
                    } else {


                        let hashed1 = await common.GenerateEncryptedPassword(password);

                        let _user = {
                            firstname: firstname,
                            lastname: lastname,
                            phoneno: phoneno,
                            interest: interest,
                            email: email,
                            address: address,
                            datecreated: new Date(),
                            passwordsalt: hashed1,
                            passwordhash: hashed1
                        };

                        let data = await knex("betchat_users").insert(_user);

                        if (data[0] > 0) {
                            res.status(200).json(common.success_return("Account profile created successfully, please login with your credentials", []))
                        } else {
                            res.json(common.error_log_return("Error creating account, please try again later"));
                        }
                    }

                } else { res.status(200).json(common.error_return("Please confirm your password entered")); }
            } else { res.status(200).json(common.error_return("The area of interest can either be Lotto or Betting, please review")); }
        } else { res.status(200).json(common.error_return("All fields are required")); }
    } catch (err) { res.status(500).json(common.error_log_return(err, req)); }
});

/**
 * @swagger
 * /user/signin:
 *  post:
 *    summary: Sign in with your credentials
 *    tags:
 *      - User
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *              password:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.route('/user/signin').post(async (req, res, next) => {

    try {

        let { email, password } = req.body;


        let _user = await knex("betchat_users").select("*").where("email", email).first();

        if (_user == null || _user == undefined) {
            res.json(common.error_return("Incorrect username/password, please try again"));
        } else {


            let hashed1 = await common.VerifyEncryptedPassword(password, _user.passwordhash);

            if (hashed1) { //true
                let token = jwt.GenerateToken(_user.id, email);

                res.status(200).json({
                    Code: 1,
                    Message: "Login successful",
                    Token: token,
                    Data: await GetProfile(_user.id)
                });

            } else {
                res.status(200).json(common.error_return("Incorrect username/password"));
            }
        }
    } catch (err) {

        res.status(500).json(common.error_log_return(err, req));
    }

});


/**
 * @swagger
 * /user/profile:
 *  get:
 *    summary: Get the logged in user profile. Authorization required
 *    tags:
 *      - User
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.get('/user/profile', jwt.ValidateToken, async (req, res, next) => {
    try {
        let data = req.body.login;
        let id = data.user_id;

        res.status(200).json(common.success_return("Profile", await GetProfile(id)));

    } catch (err) {
        res.status(401).json(common.error_log_return(err, req));
    }
});



/**
 * @swagger
 * /feeds:
 *  post:
 *    summary: Post a feed. (NB. interest can only be Lotto or Betting). Authorization required
 *    tags:
 *      - Feeds
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              subject:
 *                type: string
 *              detail:
 *                type: string
 *              interest:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.post('/feeds', jwt.ValidateToken, async (req, res, next) => {

    try {
        let { subject, detail, interest } = req.body;
        let { user_id } = req.body.login;


        if (interest == "Lotto" || interest == "Betting") {
            if (detail != "" && subject != "") {
                let _feed = {
                    userid: user_id,
                    datecreated: new Date(),
                    detail: detail,
                    subject: subject,
                    interest: interest
                };

                let data = await knex("betchat_feeds").insert(_feed);

                if (data[0] > 0) {
                    res.json(common.success_return(interest + " feed posted successfully", await GetFeeds(interest)));
                } else {
                    res.json(common.error_log_return("Error posting feed, please try again later"));
                }
            } else {
                res.json(common.error_log_return("The subject and detail are required"));
            }
        } else {
            res.json(common.error_return("The feed interest can either be Lotto or Betting"));
        }

    } catch (err) { res.json(common.error_log_return(err, req)); }
});

/**
 * @swagger
 * /feeds/all:
 *  get:
 *    summary: Get all feeds (Lotto and Betting). Authorization required
 *    tags:
 *      - Feeds
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.get('/feeds/all', jwt.ValidateToken, async (req, res, next) => {
    try {
        res.status(200).json(common.success_return("All Feeds", await GetFeeds("All")));

    } catch (err) {
        res.status(500).json(common.error_log_return(err, req));
    }
});

/**
 * @swagger
 * /feeds/lotto:
 *  get:
 *    summary: Get all Lotto feeds only. Authorization required
 *    tags:
 *      - Feeds
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.get('/feeds/lotto', jwt.ValidateToken, async (req, res, next) => {
    try {
        res.status(200).json(common.success_return("Only Lotto Feeds", await GetFeeds("Lotto")));

    } catch (err) {
        res.status(500).json(common.error_log_return(err, req));
    }
});

/**
 * @swagger
 * /feeds/betting:
 *  get:
 *    summary: Get all Betting feeds only. Authorization required
 *    tags:
 *      - Feeds
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.get('/feeds/betting', jwt.ValidateToken, async (req, res, next) => {
    try {
        res.status(200).json(common.success_return("Only Betting Feeds", await GetFeeds("Betting")));

    } catch (err) {
        res.status(500).json(common.error_log_return(err, req));
    }
});


module.exports = router;
