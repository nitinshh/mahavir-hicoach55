const db = require("../../models");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const users = db.users;
const cms = db.cms
var privacy_title = "privacy"
var about_title = "about"
var terms_title = "terms"
module.exports = {
    privacy_policy: async (req, res) => {
        try {
            const privacy_policy = await cms.findOne({
                where: {
                    deletedAt: null, type: 1
                },
                raw:true,
                nest:true
            })
            console.log(privacy_policy, ">>>>>>");
            res.render('Admin/LandingPages/privacyPolicy', {title: privacy_title, privacy_policy })
        } catch (error) {
            return helper.error(res, error)
        }
    },
};
