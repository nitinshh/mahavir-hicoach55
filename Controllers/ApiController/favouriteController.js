const envfile = process.env;
let CryptoJS = require('crypto-js');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const sequelize = require('sequelize');
const Op = sequelize.Op;
let jwt = require('jsonwebtoken');
const { req } = require('express');
const { users, favourite, categories } = require("../../models");

var deletedTime = sequelize.literal('CURRENT_TIMESTAMP')

module.exports = {

    favourite_games: async (req, res) => {
        try {
            const v = new Validator(req.body, {
                user_id: 'required',
                categoryId: 'required',
                subcategoryId: 'required',
                status: 'required|integer',
            });
            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }
            const find_user = await favourite.findOne({
                where: {
                    user_id: req.body.user_id,
                    categoryId: req.body.categoryId,
                    subcategoryId: req.body.subcategoryId,
                },
                raw: true,
                nest: true
            });

            if (find_user == null) {
                const favourite_create = await favourite.create(req.body);
                const create_favourite = await favourite.findOne({
                    where: {
                        id: favourite_create.dataValues.id
                    },
                    raw: true,
                    nest: true
                })
                let msg = create_favourite.status == 1 ? 'favourite' : 'unfavourite'
                return helper.success(res, `Game ${msg} succesfully`, create_favourite)
            } else {
                let update = await favourite.update(
                    {
                        status: req.body.status
                    },
                    {
                        where: {
                            id: find_user.id
                        },
                    }
                );
                const favourite_find = await favourite.findOne({
                    where: {
                        id: find_user.id,
                    },
                    raw: true,
                    nest: true
                });
                let msg = favourite_find.status == 1 ? 'favourite' : 'unfavourite'
                return helper.success(res, `Game ${msg} succesfully`, favourite_find)
            }
        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    favourite_listing: async (req, res) => {
        try {
            const find_favourite = await favourite.findAll({
                include: [{ model: users, as: "users" }, { model: categories, as: "category" }],
                where: { user_id: req.auth.id,status:1 },
                raw: true,
                nest: true
            });
            return helper.success(res, `Get favourite listing succesfully`, find_favourite)
        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
};
