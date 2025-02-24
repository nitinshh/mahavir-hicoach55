const db = require("../../models");
const helper = require("../../helpers/helper");
const Content = db.cms;
module.exports = {
    community_guidelines: async (req, res) => {
        try {
            const privacypolicy = await Content.findOne({
                where: {
                    type: 1,
                },
            });
            if (privacypolicy) {
                return helper.success(res, "Community Guidelines Get Succesfully ", privacypolicy);
            }
        } catch (error) {
            return helper.error403(res, error);
        }
    },
    termsAndConditions: async (req, res) => {
        try {
            const termsAndConditions = await Content.findOne({
                where: {
                    type: 2,
                },
            });
            if (termsAndConditions) {
                return helper.success(res, "Terms And Conditions Get Succesfully ", termsAndConditions);
            }
        } catch (error) {
            return helper.error403(res, error);
        }
    },
};