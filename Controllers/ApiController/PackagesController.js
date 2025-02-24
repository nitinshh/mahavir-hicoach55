const db = require("../../models");
const envfile = process.env;
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const Op = sequelize.Op

const { users, packages } = require("../../models");

var deletedTime = sequelize.literal('CURRENT_TIMESTAMP')

module.exports = {

    add_package: async (req, res) => {
        try {
            const v = new Validator(req.body, {
                title: "required",
                number_of_hours: "required",
                discount: "required",
            });
            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }
            req.body.user_id = req.auth.id

            let create_package = await packages.create(req.body);
            let find_package = await packages.findOne({
                where: {
                    id: create_package.dataValues.id
                },
                raw: true,
                nest: true
            })

            return helper.success(res, "create packege succesfully", find_package);
        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    delete_package: async (req, res) => {
        try {
            // Validate the input
            const v = new Validator(req.body, {
                id: "required",
            });
            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }

            // Find package and check if it's being used in any bookings
            const find_package = await packages.findOne({
                attributes: [
                    
                   [ sequelize.literal(
                        `COALESCE((
                            SELECT CASE 
                                WHEN COUNT(*) > 0 AND SUM(user_packages.credits) > 0 THEN 1
                                ELSE 0 
                            END 
                            FROM user_packages 
                            WHERE user_packages.package_id = packages.id), 0)`
                    ),
                    "is_save"]
            ],
                where: {
                    id: req.body.id
                },raw:true
            });
         
            if (!find_package) {
                return helper.error403(res, "Package not found.");
            }

            // Check if the package is used in bookings
            if (find_package.is_save== 0) {
                const deletedTime = new Date();  // Get current time for deletion
                await packages.update({
                    deletedAt: deletedTime
                }, {
                    where: {
                        id: req.body.id
                    }
                });
                return helper.success(res, "Package deleted successfully.");
            } else {
                return helper.error403(res, "Package cannot be deleted because it is already in use.");
            }

        } catch (error) {
            return helper.error403(res, error.message);
        }
    },
    package_details: async (req, res) => {
        try {
            // Validate the input
            const v = new Validator(req.body, {
                package_id: "required",
            });
            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }

            const find_package = await packages.findOne({
                attributes: [
                    'id', 'user_id', 'title', 'number_of_hours', 'discount',
                 
                    [sequelize.literal(
                        `COALESCE((
                            SELECT CASE 
                                WHEN COUNT(*) > 0 AND SUM(user_packages.credits) > 0 THEN 1
                                ELSE 0 
                            END 
                            FROM user_packages 
                            WHERE user_packages.package_id = packages.id 
                            AND user_packages.user_id = ${req.auth.id}
                        ), 0)`
                    ),
                    "is_save"],
              
                   [ sequelize.literal(
                        `COALESCE((
                            SELECT CASE 
                                WHEN COUNT(*) > 0 AND SUM(user_packages.credits) > 0 THEN SUM(user_packages.credits)
                                ELSE packages.number_of_hours
                            END 
                            FROM user_packages 
                            WHERE user_packages.package_id = packages.id 
                            AND user_packages.user_id = ${req.auth.id}
                        ), packages.number_of_hours)`
                    ),
                    "credits"]
                  
                ],
                where: {
                    id: req.body.package_id
                },raw:true
            });


            if (!find_package) {
                return helper.error403(res, "Package not found.");
            }
            return helper.success(res, "Package details get successfully.",find_package);
        
        } catch (error) {
            return helper.error403(res, error.message);
        }
    },
    listing_package: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;  // Default values: page 1, limit 10
            const offset = (page - 1) * limit;
    
            // Find package list with pagination
            const { count, rows: packageList } = await packages.findAndCountAll({
                attributes: [
                    'id', 'user_id', 'title', 'number_of_hours', 'discount',
                    // Add the distance calculation attribute
                    // [
                    //     sequelize.literal(
                    //         `COALESCE((SELECT COUNT(*) FROM user_packages WHERE user_packages.package_id = packages.id AND user_packages.user_id=${req.auth.id} AND user_packages.credits!==0 ), 0)`
                    //     ),
                    //     "is_save"
                    // ],
                    // [
                    // sequelize.literal(
                    //     `COALESCE((SELECT COUNT(*) FROM user_packages WHERE user_packages.package_id = packages.id AND user_packages.user_id=${req.auth.id} AND user_packages.credits >0 ), 0)`
                    // ),
                    // "is_save"],
                    [sequelize.literal(
                        `COALESCE((
                            SELECT CASE 
                                WHEN COUNT(*) > 0 AND SUM(user_packages.credits) > 0 THEN 1
                                ELSE 0 
                            END 
                            FROM user_packages 
                            WHERE user_packages.package_id = packages.id 
                            AND user_packages.user_id = ${req.auth.id} AND user_packages.payment_status=1
                        ), 0)`
                    ),
                    "is_save"],
              
                   [ sequelize.literal(
                        `COALESCE((
                            SELECT CASE 
                                WHEN COUNT(*) > 0 AND SUM(user_packages.credits) > 0 THEN SUM(user_packages.credits)
                                ELSE packages.number_of_hours
                            END 
                            FROM user_packages 
                            WHERE user_packages.package_id = packages.id 
                            AND user_packages.user_id = ${req.auth.id} AND user_packages.payment_status=1
                        ), packages.number_of_hours)`
                    ),
                    "credits"]
                  
                ],
                where: {
                    user_id: req.body.user_id || req.auth.id
                },
                raw: true,
                order: [["id", "DESC"]],
                limit: parseInt(limit),  // Limit for pagination
                offset: parseInt(offset)  // Offset for pagination
            });
    
            // Return the list of packages with pagination metadata
            const totalPages = Math.ceil(count / limit);
            return helper.success(res, "Package list retrieved successfully", {
                packages: packageList,
                currentPage: parseInt(page),
                totalPages: totalPages,
                totalPackages: count
            });
    
        } catch (error) {
            return helper.error403(res, error.message || error);
        }
    }
    

}