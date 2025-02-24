let db = require("../models");
let sequelize = require("sequelize");
const helper = require("../helpers/helper");
const { Op } = require("sequelize");

db.booking_cancels.belongsTo(db.users, {
  foreignKey: "user_id",
  as: "userName",
});
db.booking_cancels.belongsTo(db.bookings, {
  foreignKey: "booking_id",
  as: "booking_data",
});
db.promote_slot.belongsTo(db.users, {
  foreignKey: "coach_id",
  as: "coachDetails1",
});
db.promote_slot.hasMany(db.promote_slotes_times, {
  foreignKey: "promote_id",
  as: "promote_slot_data",
});

module.exports = function (io) {
  io.on("connection", (socket) => {
    socket.on("connect_user", async (data) => {
      try {
        // Check if data is null or undefined
        if (!data) {
          socket.emit("connect_user", { error_message: "Invalid data provided" });
          return;
        }
 
        let user_type = data.user_type || "user";

        if (user_type !== "admin" && data.token) {
          const isValidToken = await helper.authenticateToken(data.token);
          if (!isValidToken.success) {
            socket.emit("connect_user", { message: "Session Expired" });
            return;
          }
        }

        if (!data.user_id) {
          socket.emit("connect_user", { error_message: "User ID is missing" });
          return;
        }
    
        let find_socket_id = await db.sockets.findOne({
          where: { user_id: data.user_id },
          raw: true,
        });
    
        if (find_socket_id) {
          await db.sockets.update(
            {
              socket_id: socket.id,
              online_status: "online",
            },
            {
              where: { user_id: data.user_id },
            }
          );
        } else {
          const create_socket_id = await db.sockets.create({
            socket_id: socket.id,
            user_id: data.user_id,
            online_status: "online",
          });
    
          find_socket_id = await db.sockets.findOne({
            where: { id: create_socket_id.id },
            raw: true,
          });
        }
    
        socket.emit("connect_user", {
          success_message: "connected successfully",
          data: find_socket_id,
        });
      } catch (error) {
        console.error("Error:", error);
        socket.emit("connect_user", {
          error_message: "An error occurred",
        });
      }
    });
    
    // socket.on("connect_user", async (data) => {
    //   try {

    //     console.log(data,"kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
        
    //     let user_type = data.user_type || "user";

    //     if (user_type !== "admin") {
    //       const isValidToken = await helper.authenticateToken(data.token);
    //       if (!isValidToken.success) {
    //         socket.emit("connect_user", { message: "Session Expired" });
    //         return;
    //       }
    //     }

    //     let find_socket_id = await db.sockets.findOne({
    //       where: { user_id: data.user_id },
    //       raw: true,
    //     });

    //     if (find_socket_id) {
    //       await db.sockets.update(
    //         {
    //           socket_id: socket.id,
    //           online_status: "online",
    //         },
    //         {
    //           where: { user_id: data.user_id },
    //         }
    //       );
    //     } else {
    //       const create_socket_id = await db.sockets.create({
    //         socket_id: socket.id,
    //         user_id: data.user_id,
    //         online_status: "online",
    //       });

    //       find_socket_id = await db.sockets.findOne({
    //         where: { id: create_socket_id.id },
    //         raw: true,
    //       });
    //     }

    //     socket.emit("connect_user", {
    //       success_message: "connected successfully",
    //       data: find_socket_id,
    //     });
    //   } catch (error) {
    //     console.error("Error:", error);
    //     socket.emit("connect_user", {
    //       error_message: "An error occurred",
    //     });
    //   }
    // });

    // disconnect///
    socket.on("disconnect", async () => {
      try {
        let check_user = await db.sockets.findOne({
          where: {
            socket_id: socket.id,
          },
        });

        if (check_user) {
          await db.sockets.update(
            {
              online_status: "offline", // Set online_status to 0 when disconnecting
            },
            {
              where: {
                id: check_user.id,
              },
            }
          );
        }
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    socket.on("send_message", async (data) => {
      try {

        let sender_type = data.sender_type || "user";
        if (sender_type == "admin") {
        } else {
          const isValidToken = await helper.authenticateToken(data.token);

          if (!isValidToken.success) {
            socket.emit("send_message", { message: "Session Expired" });
            return;
          }
        }
        const sender_id = data.sender_id;
        const receiver_id = data.receiver_id;

        let message_data;
        let success_message;

        // Find if a room exists between sender and receiver
        let rooms = await db.rooms.findOne({
          where: {
            [Op.or]: [
              {
                sender_id: sender_id,
                receiver_id: receiver_id,
              },

              {
                sender_id: receiver_id,
                receiver_id: sender_id,
              },
            ],
          },
          raw: true,
        });

        // If no room exists, create a new room and set last_message_id to null initially
        if (rooms == null) {
          rooms = await db.rooms.create({
            sender_id: sender_id,
            receiver_id: receiver_id,
            last_message_id: 0, // Set last_message_id as null initially
          });
        }
        // Create the message in the chats table
        let message = await db.chats.create({
          message: data.message,
          message_type: data.message_type || 0,
          room_id: rooms.id,
          sender_id: sender_id,
          receiver_id: receiver_id,
        });
        // Update the room with the last message ID
        await db.rooms.update(
          {
            last_message_id: message.id,
            is_deleted: 0,
          },
          { where: { id: rooms.id } }
        );

        // Fetch the message data along with sender/receiver information
        message_data = await db.chats.findByPk(message.id, {
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT first_name FROM users WHERE id=chats.sender_id)`
                ),
                "firstName",
              ],
              [
                sequelize.literal(
                  `(SELECT last_name FROM users WHERE id=chats.sender_id)`
                ),
                "lastName",
              ],
              [
                sequelize.literal(
                  `(SELECT image FROM users WHERE id=chats.sender_id)`
                ),
                "senderImage",
              ],
              [
                sequelize.literal(
                  `(SELECT socket_id FROM sockets WHERE user_id=chats.receiver_id)`
                ),
                "socket_id",
              ],
              [
                sequelize.literal(
                  `(SELECT device_token FROM users WHERE id=chats.receiver_id)`
                ),
                "deviceToken",
              ],
            ],
          },
          raw: true,
        });

        var ndata = {
          msg: "New Message",
          title: "HiCoach",
          request_id: message_data.id,
          message: `${message_data.firstName} has sent a new message`,
          message_type: data.message_type,
          sender_id: sender_id,
          sender_name: message_data.firstName,
          sender_image: message_data.senderImage,
          type: 6,
        };
        let find_room = await db.rooms.findOne({

          where: {
            [Op.or]: [
              {
                sender_id: sender_id,
                receiver_id: receiver_id,
              },

              {
                sender_id: receiver_id,
                receiver_id: sender_id,
              },
            ],
          }, raw: true

        })
        if (find_room.online_status == 1 || find_room.online_status == 0) {

          helper.sendPushNotification(message_data.deviceToken, ndata);
        }
        // Emit the message to the receiver
        io.to(message_data.socket_id).emit("send_message", {
          success_message: "message sent successfully",
          data: message_data,
        });
        io.to(message_data.socket_id).emit("unread_message_count", {
          success_message: "message sent successfully",
          data: message_data,
        });

        // Send success message back to the sender
        socket.emit("send_message", {
          success_message: "message sent successfully",
          data: message_data,
        });
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("inbox", async (get_data) => {
      try {
        let sender_type = get_data.sender_type || "user";
        if (sender_type == "admin") {
        } else {
          const isValidToken = await helper.authenticateToken(get_data.token);

          if (!isValidToken.success) {
            socket.emit("inbox", { message: "Session Expired" });
            return;
          }
        }

        let constantList = await db.rooms.findAll({
          attributes: {
            include: [
              [
                sequelize.literal(`
                  CASE
                  WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id
                  ELSE rooms.receiver_id
                  END
                `),
                "receiver_user_id",
              ],
              [
                sequelize.literal(`
                  (SELECT message_type FROM chats WHERE chats.id = rooms.last_message_id 
                    AND NOT EXISTS (
           
SELECT 1 FROM chat_deletes WHERE chat_deletes.message_id = chats.id) LIMIT 1)
                `),
                "messageType",
              ],
              [
                sequelize.literal(`
                  (SELECT message FROM chats WHERE chats.id = rooms.last_message_id 
                    AND NOT EXISTS (SELECT 1 FROM chat_deletes WHERE chat_deletes.message_id = chats.id) LIMIT 1)
                `),
                "lastMessageId",
              ],
              [
                sequelize.literal(`
                  CASE
                  WHEN EXISTS (
                    SELECT 1 FROM blocks
                    WHERE blocks.block_by = ${get_data.sender_id}
                    AND blocks.block_to = 
                    (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END)
                    LIMIT 1
                  ) THEN 1
                  ELSE 0
                  END
                `),
                "blockByMe",
              ],
              [
                sequelize.literal(`
                  CASE
                  WHEN EXISTS (
                    SELECT 1 FROM blocks
                    WHERE blocks.block_by = 
                    (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END)
                    AND blocks.block_to = ${get_data.sender_id}
                    LIMIT 1
                  ) THEN 1
                  ELSE 0
                  END
                `),
                "blockByOther",
              ],
              [
                sequelize.literal(`
                  CASE
                  WHEN EXISTS (
                    SELECT 1 FROM reports
                    WHERE reports.reported_to = 
                    (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END)
                    AND reports.reported_by = ${get_data.sender_id}
                    LIMIT 1
                  ) THEN 1
                  ELSE 0
                  END
                `),
                "isReport",
              ],
              [
                sequelize.literal(`
                  (SELECT first_name FROM users 
                   WHERE users.id = 
                   (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END) 
                   LIMIT 1)
                `),
                "receiverfName",
              ],
              [
                sequelize.literal(`
                  (SELECT last_name FROM users 
                   WHERE users.id = 
                   (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END) 
                   LIMIT 1)
                `),
                "receiverlName",
              ],
              [
                sequelize.literal(`
                  (SELECT image FROM users 
                   WHERE users.id = 
                   (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END) 
                   LIMIT 1)
                `),
                "receiverImage",
              ],

              [
                sequelize.literal(`
                  COALESCE(
                    (SELECT role FROM users 
                     WHERE users.id = 
                     (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END) 
                     LIMIT 1), 0)
                `),
                "role",
              ],
              [
                sequelize.literal(`
                  COALESCE(
                    (SELECT online_status FROM sockets 
                     WHERE sockets.user_id = 
                     (CASE WHEN rooms.receiver_id = ${get_data.sender_id} THEN rooms.sender_id ELSE rooms.receiver_id END) 
                     LIMIT 1), "offline")
                `),
                "is_online",
              ],
              [
                sequelize.literal(`
                (SELECT COUNT(*) FROM chats
                WHERE chats.receiver_id = ${get_data.sender_id}
                AND chats.room_id = rooms.id
                AND chats.is_read = 0
                )
                `),
                "unread_msg",
              ],
            ],
          },
          where: {
            [Op.or]: [
              { sender_id: get_data.sender_id },
              { receiver_id: get_data.sender_id },
            ],
          },
          order: [["updatedAt", "DESC"]],
          raw: true,
        });

        let success_message = {
          success_message: "User Chats List",
          code: 200,
          getdata: constantList,
        };

        socket.emit("inbox", success_message);
      } catch (error) {
        console.error("Error fetching constant chats:", error);
      }
    });

    socket.on("message_listing", async (data) => {
      try {
        let sender_type = data.sender_type || "user";
        if ((sender_type = "admin")) {
        } else {
          const isValidToken = await helper.authenticateToken(data.token);

          if (!isValidToken.success) {
            socket.emit("message_listing", { message: "Session Expired" });
            return;
          }
        }

        let whereas = {
          [Op.or]: [
            {
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
            },
            {
              sender_id: data.receiver_id,
              receiver_id: data.sender_id,
            },
          ],
        };

        let update_read = await db.chats.update(
          {
            is_read: 1,
          },
          {
            where: {
              sender_id: data.receiver_id,
              receiver_id: data.sender_id,
            },
          }
        );

        let message_listings = await db.chats.findAll({
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT first_name FROM users WHERE id=chats.sender_id)`
                ),
                "senderfName",
              ],
              [
                sequelize.literal(
                  `(SELECT last_name FROM users WHERE id=chats.sender_id)`
                ),
                "senderlName",
              ],
              [
                sequelize.literal(
                  `(SELECT image FROM users WHERE id=chats.sender_id)`
                ),
                "senderImage",
              ],
              [
                sequelize.literal(
                  `(SELECT role FROM users WHERE id=chats.sender_id)`
                ),
                "senderRole",
              ],
              [
                sequelize.literal(
                  `(SELECT first_name FROM users WHERE id=chats.receiver_id)`
                ),
                "receiverfName",
              ],
              [
                sequelize.literal(
                  `(SELECT last_name FROM users WHERE id=chats.receiver_id)`
                ),
                "receiverlName",
              ],
              [
                sequelize.literal(
                  `(SELECT image FROM users WHERE id=chats.receiver_id)`
                ),
                "receiverImage",
              ],
              [
                sequelize.literal(
                  `(SELECT role FROM users WHERE id=chats.receiver_id)`
                ),
                "receiverRole",
              ],
            ],
          },
          where: {
            ...whereas,
            [Op.and]: [
              sequelize.literal(
                `NOT EXISTS (SELECT 1 FROM chat_deletes WHERE chat_deletes.message_id = chats.id AND chat_deletes.sender_id = ${data.sender_id})`
              ),
            ],
          },
          raw: true,
        });
        let success_message = {
          success_message: "message_listings",
          listing: message_listings,
        };

        socket.emit("message_listing", success_message);
      } catch (error) {
        console.error("Error fetching message listings: ", error);
      }
    });

    socket.on("blocked_users", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("blocked_users", { message: "Session Expired" });
          return;
        }

        const { block_to, block_by, action } = data;
        let msg = "";
        let data1 = {};

        // Check if user is trying to block themselves
        if (block_to === block_by) {
          msg = "Cannot block yourself";
          socket.emit("blocked_users", { success_message: { msg } });
          return;
        }

        // Check if the user to be blocked exists
        const userToBlock = await db.users.findByPk(block_to);
        if (!userToBlock) {
          msg = "User to be blocked does not exist";
          socket.emit("blocked_users", { success_message: { msg } });
          return;
        }

        // Handle block/unblock based on action
        const existingBlock = await db.blocks.findOne({
          where: { block_to, block_by },
        });

        if (action === 1) {
          // Blocking user
          if (existingBlock) {
            msg = "User is already blocked";
            data1 = { blockByMe: 1, blockByOther: 0 };
          } else {
            await db.blocks.create({ block_to, block_by });
            msg = "User blocked successfully";
            data1 = { blockByMe: 1, blockByOther: 0 };
          }
        } else if (action == 0) {
          // Unblocking user
          if (existingBlock) {
            await db.blocks.destroy({ where: { block_to, block_by } });
            msg = "User unblocked successfully";
            data1 = { blockByMe: 0, blockByOther: 0 };
          } else {
            msg = "User is not blocked";
            data1 = { blockByMe: 0, blockByOther: 0 };
          }
        } else {
          msg = "Invalid action value";
          socket.emit("blocked_users", { success_message: { msg } });
          return;
        }

        // Check block status
        const blockByMe = await db.blocks.findOne({
          where: { block_to, block_by },
        });
        const blockByOther = await db.blocks.findOne({
          where: { block_to: block_by, block_by: block_to },
        });

        data1 = {
          blockByMe: blockByMe ? 1 : 0,
          blockByOther: blockByOther ? 1 : 0,
        };

        if (blockByMe && blockByOther) {
          msg = "You and the other user have blocked each other";
          data1 = { blockByMe: 1, blockByOther: 1 };
        } else if (blockByMe) {
          msg = "You have blocked the other user";
          data1 = { blockByMe: 1, blockByOther: 0 };
        } else if (blockByOther) {
          msg = "The other user has blocked you";
          data1 = { blockByMe: 0, blockByOther: 1 };
        }

        // Notify blocked user if online
        const socketUserToBlock = await db.sockets.findOne({
          where: { user_id: block_to },
        });

        if (socketUserToBlock) {
          const blockToMsg = action == 0 ? "You have been unblocked" : "You have been blocked";


          io.to(socketUserToBlock.socket_id).emit("blocked_users", {
            success_message: { msg: blockToMsg, data1: data1 },
          });
          io.to(socketUserToBlock.socket_id).emit("get_block_status", {
            success_message: { msg: blockToMsg, data1: data1 },
          });
        }

        // Notify blocking user
        socket.emit("blocked_users", { success_message: { msg, data1 } });
      } catch (error) {
        console.error(error);
        socket.emit("blocked_users_error", {
          error: error.message || "An error occurred while processing the request.",
        });
      }
    });

    socket.on("get_block_status", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("get_block_status", { message: "Session Expired" });
          return;
        }

        const { block_to, block_by } = data;

        let msg = "";
        let data1 = {};

        // Check if block_by has blocked block_to
        const blockByMe = await db.blocks.findOne({
          where: { block_to, block_by },
        });

        // Check if block_to has blocked block_by
        const blockByOther = await db.blocks.findOne({
          where: { block_to: block_by, block_by: block_to },
        });

        // Set block statuses based on the results
        data1 = {
          blockByMe: blockByMe ? 1 : 0,
          blockByOther: blockByOther ? 1 : 0,
        };

        if (blockByMe && blockByOther) {
          msg = "You and the other user have blocked each other";
        } else if (blockByMe) {
          msg = "You have blocked the other user";
        } else if (blockByOther) {
          msg = "The other user has blocked you";
        } else {
          msg = "Neither you nor the other user are blocked";
        }

        socket.emit("get_block_status", {
          success_message: {
            msg,
            data1,
          },
        });
      } catch (error) {
        console.error(error);
        socket.emit("get_block_status", {
          error: error.message || "An error occurred while fetching the block status.",
        });
      }
    });

    // ///////////////report///
    socket.on("report_user", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("report_user", { message: "Session Expired" });
          return;
        }

        reportadd = await db.reports.create({
          reported_by: data.reported_by,
          reported_to: data.reported_to,
          reason: data.reason,
        });
        success_message = {
          success_message: "Report sent successfully",
        };
        socket.emit("report_user", success_message);
      } catch (error) {
        console.log(error, ">>>>>>>>>>");
        throw error;
      }
    });

    ////is typeing
    socket.on("typing_msg", async (data) => {
      try {
        let find = await db.rooms.findOne({
          where: {
            [Op.or]: [
              {
                sender_id: data.receiver_id,
                receiver_id: data.sender_id,
              },
              {
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
              },
            ],
          },
          raw: true,
        });

        let getRecieverSocketId = await db.sockets.findOne({
          attributes: ["socket_id"],
          where: {
            user_id: data.receiver_id,
          },
          raw: true,
        });

        // Find the sender's details
        let find_sender = await db.users.findOne({
          where: {
            id: data.sender_id,
          },
          raw: true,
        });

        // Create the typing object
        let typing = {
          senderName: find_sender.name,
          status: data.status,
        };

        // Create the success message
        let success_message = {
          success_message: "Typing fetched successfully",
          code: 200,
          data: typing,
        };

        if (getRecieverSocketId && getRecieverSocketId.socket_id) {
          io.to(getRecieverSocketId.socket_id).emit(
            "typing_msg",
            success_message
          );
        }
      } catch (error) {
        console.error("Error in typing_msg event: ", error);
      }
    });
    // read story
    socket.on("read_record", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("read_record", { message: "Session Expired" });
          return;
        }

        // Check if the record already exists
        const existingRecord = await db.read_record.findOne({
          where: {
            user_id: data.user_id,
            media_id: data.media_id,
          },
        });

        if (!existingRecord) {
          const storyData = await db.user_stories.findOne({
            where: {
              id: data.media_id,
            },
            raw: true,
          });
          // Create the record if it does not exist
          await db.read_record.create({
            user_id: data.user_id,
            media_id: data.media_id,
            story_by_id: storyData.user_id,
          });
        }

        const success_message = {
          success_message: "Event marked as read successfully",
        };
        socket.emit("read_record", success_message);
      } catch (error) {
        console.error(error);
        const error_message = {
          error_message: "An error occurred while processing the request",
        };
        socket.emit("read_record", error_message);
        throw error;
      }
    });

    socket.on("clear_chat", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("clear_chat", { message: "Session Expired" });
          return;
        }

        let existingRecord = null;

        existingRecord = await db.rooms.findOne({
          where: {
            [Op.or]: [
              {
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
              },
              {
                sender_id: data.receiver_id,
                receiver_id: data.sender_id,
              },
            ],
          },
          raw: true,
        });

        if (!existingRecord) {
          const error_message = {
            error_message: "Chat record not found",
          };
          return socket.emit("clear_chat", error_message);
        }

        let find_chat = [];

        find_chat = await db.chats.findAll({
          where: {
            room_id: existingRecord.id,
          },
          raw: true,
          nest: true,
        });

        for (let i = 0; i < find_chat.length; i++) {
          await db.chat_deletes.create({
            sender_id: data.sender_id,
            message_id: find_chat[i].id,
          });
        }

        let success_message = {
          success_message: "Messages deleted successfully",
          code: 200,
          getdata: "",
        };

        socket.emit("clear_chat", success_message);
      } catch (error) {
        console.error(error);
        const error_message = {
          error_message: "An error occurred while processing the request",
        };
        socket.emit("clear_chat", error_message);
      }
    });
    socket.on("delete_chat", async (data) => {
      try {
     
        const isValidToken = await helper.authenticateToken(data.token);

         if (!isValidToken.success.success) {
          socket.emit("delete_chat", { message: "Session Expired" });
          return;
        }

        const existingRecord = await db.rooms.findOne({
          where: {
            [Op.or]: [
              {
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
              },
              {
                sender_id: data.receiver_id,
                receiver_id: data.sender_id,
              },
            ],
          },
          raw: true,
        });

        if (!existingRecord) {
          socket.emit("delete_chat", {
            error_message: "Chat record not found",
          });
          return;
        }

        let find_chat = [];

        // Check if chat is not deleted yet and sender is not the one who previously deleted it
        if (
          existingRecord.is_deleted == 0 ||
          existingRecord.is_deleted !== data.sender_id
        ) {
          // Update is_deleted to sender_id
          await db.rooms.update(
            { is_deleted: data.sender_id },
            { where: { id: existingRecord.id } }
          );
        } else {
          // Delete the room if both participants have deleted the chat
          await db.rooms.destroy({ where: { room_id: existingRecord.id } });
        }

        // Retrieve all chat messages within the room
        find_chat = await db.chats.findAll({
          where: { room_id: existingRecord.id },
          raw: true,
          nest: true,
        });

        // Record each deleted message
        for (let i = 0; i < find_chat.length; i++) {
          await db.chat_deletes.create({
            sender_id: data.sender_id,
            message_id: find_chat[i].id,
          });
        }

        // Send success response back to the client
        socket.emit("delete_chat", {
          success_message: "Messages deleted successfully",
          code: 200,
        });
      } catch (error) {
        console.error(error);
        socket.emit("delete_chat", {
          error_message: "An error occurred while processing the request",
        });
      }
    });

    socket.on("home_coach", async (data) => {
      try {
     
        const isValidToken = await helper.authenticateToken(data.token);

         if (!isValidToken.success) {
          socket.emit("home_coach", { message: "Session Expired" });
          return;
        }
        const coachId = isValidToken.user.id;
        const currentDate = new Date();
     
        const formattedDate = currentDate.toISOString().split('T')[0]; 
        const currentTime = currentDate.toTimeString().slice(0, 5); // 'HH:MM' format

        let classes_today = await db.bookings.findAll({
          include: [
            {
              model: db.users,
              as: "userDetails",
            },
          ],
          where: {

            payment_status: 1,
            booking_status: 1,
            coach_id: coachId,

            user_id: {
              [Op.ne]: 0,
            },

            date1: {
              [Op.eq]: new Date(formattedDate),  
            }, 
            start_time: {
              [Op.gte]: currentTime,

            },

          },
          limit: 5,
        });

        let cancel_class = await db.booking_cancels.findAll({
          include: [
            {
              model: db.users,
              as: "userName",
            },
          ],
          where: {
            coach_id: coachId,
            status: 0,
            type: 1
          },
          limit: 5,
        });


        let classes_request = await db.bookings.findAll({
          include: [
            {
              model: db.users,
              as: "userDetails",
            },
          ],
          where: {
            booking_status: 0,
            coach_id: coachId,
          },
          limit: 5,
        });

        socket.emit("home_coach", {
          success_message: "Get home data successfully",
          data: {
            classes_today: classes_today,
            cancel_class: cancel_class,
            classes_request: classes_request,
          },
        });
      } catch (error) {
        console.error(error);
        socket.emit("home_coach", {
          error:
            error.message || "An error occurred while processing the request.",
        });
      }
    });
    socket.on("home_student", async (data) => {
      try {
             const isValidToken = await helper.authenticateToken(data.token);
         if (!isValidToken.success) {
          socket.emit("home_student", { message: "Session Expired" });
          return;
        }

        const currentDate = new Date();
        const formattedDate = `${("0" + currentDate.getDate()).slice(-2)}-${(
          "0" +
          (currentDate.getMonth() + 1)
        ).slice(-2)}-${currentDate.getFullYear()}`;
        const currentTime = currentDate.toTimeString().slice(0, 5); // 'HH:MM' format
        const formattedDate1 = currentDate.toISOString().split('T')[0]; 
        const studentId = isValidToken.user.id; 
        let upcoming_lessons = await db.bookings.findAll({
          include: [
            {
              model: db.users,
              as: "coachDetails",
              include: [
                {
                  model: db.user_sports,
                  as: "user_sports_details",
                  required: false,
                  include: [
                    {
                      model: db.sports,
                      as: "sports_details",
                    },
                  ],
                },
              ],
            },
            {
              model: db.packages,
              as: "packageDetails",
            },
          ],
          // where: {
          //   booking_status: 1,
          //   user_id: studentId,
          //   user_id: {
          //     [Op.ne]: 0, 
          //   },
     
          //   date1: {
          //     [Op.eq]: new Date(formattedDate1), 
          //               },
          //   start_time: {
          //     [Op.gte]: currentTime, 
          //   },

          // },
          // limit: 5,
          where: {
            booking_status: 1,
            user_id: {
              [Op.eq]: studentId,
              [Op.ne]: 0,
            },
            date1: {
              [Op.eq]: new Date(formattedDate1),
            },
            start_time: {
              [Op.gte]: currentTime,
            },
          },
          limit: 5,
        });

        let high_rated_coach = await db.users.findAll({
          attributes: [
            [
              sequelize.literal(
                `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
              ),
              "avg_rating",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
              ),
              "rating_count",
            ],
            "id",
            "first_name",
            "last_name",
            "email",
            "image",
            "about_me",
            "hourly_rate",
            "cover_video",
            "thumbnail",
            "is_verified",
            "provide_balls",
            "address",
            "latitude",
            "longitude",
            "own_courts",
            "playing_experience",
            "coaching_experience",
            "willing_to_travel",
            "commission",
          ],

          where: {
            role: 2,
          },
          having: sequelize.literal(
            `(SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id) > 0`
          ),
          order: [
            [sequelize.literal("rating_count"), "DESC"], // Order by rating count descending
            [sequelize.literal("avg_rating"), "DESC"], // Order by average rating descending
          ],
          limit: 5,
        });

        let find_booking = await db.bookings.findAll({
          where: {
            user_id: studentId,
            deleted_at: null,
          },
          raw: true,
        });
        let those_user_save_coach = await db.user_saved_coahces.findAll({
          where: {
            user_id: studentId,
          },
          raw: true,
        });

        let ids = find_booking.map((e) => e.coach_id);
        let ids1 = those_user_save_coach.map((e) => e.coach_id);

        let combinedArray = [...ids, ...ids1];

        let find_promot_slot = await db.promote_slot.findAll({
          include: [
            {
              model: db.users,
              as: "coachDetails1",
            },
            {
              model: db.promote_slotes_times,
              as: "promote_slot_data",
            },

          ],
          where: {
            coach_id: combinedArray,
            date: formattedDate
          }
        })

        let obj = {
          upcoming_lessons: upcoming_lessons,
          hot_slot: find_promot_slot,
          high_rated_coach: high_rated_coach,
        };

        socket.emit("home_student", {
          success_message: "Get home data successfully",
          data: obj,
        });
      } catch (error) {
        console.error(error);
        socket.emit("home_student", {
          error:
            error.message || "An error occurred while processing the request.",
        });
      }
    });
    socket.on("classes_today", async (data) => {
      try {



        console.log("55555555555555555555555555555555555555555555555");
        
        const isValidToken = await helper.authenticateToken(data.token);

         if (!isValidToken.success) {
          socket.emit("classes_today", { message: "Session Expired" });
          return;
        }
        const coach_id = isValidToken.user.id; 

        const currentDate = new Date();
        const currentTime = new Date().toTimeString().slice(0, 5); // 'HH:MM' format
        const formattedDate1 = currentDate.toISOString().split('T')[0]; 

        let { page = 1, limit = 10 } = data; 
        page = parseInt(page);
        limit = parseInt(limit);
        const offset = (page - 1) * limit;

        let classes_today = await db.bookings.findAndCountAll({
          include: [
            {
              model: db.users,
              as: "userDetails",
            },
          ],
          where: {
            booking_status: 1,
            payment_status: 1,
            coach_id: coach_id,
            user_id: {
              [Op.ne]: 0, 
            },

            date1: {
              [Op.eq]: new Date(formattedDate1),  
            },
            start_time: {
              [Op.gte]: currentTime,
            },
       
          },
          order: [
            ["id", "DESC"], 
          ],
          limit, 
        });

        const totalPages = Math.ceil(classes_today.count / limit);

        socket.emit("classes_today", {
          message: "Get today classes successfully",
          classes: classes_today.rows,
          currentPage: page, 
          totalPages, 
          totalClasses: classes_today.count, 
        });
      } catch (error) {
        console.error(error);
          socket.emit("classes_today_error", {
          message: "Failed to get today classes",
          error: error.message,
        });
      }
    });
    socket.on("cancel_classes", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("cancel_classes", { message: "Session Expired" });
          return;
        }
        const coach_id = isValidToken.user.id;
        let { page = 1, limit = 10 } = data;
        page = parseInt(page);
        limit = parseInt(limit);

        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;

        const cancel_classes = await db.booking_cancels.findAndCountAll({
          include: [
            {
              model: db.users,
              as: "userName",
              attributes: [
                "id",
                "role",
                "email",
                "password",
                "image",
                "first_name",
                "last_name",
                "about_me",
                "hourly_rate",
                "cover_video",
                "thumbnail",
              ],
            },
            {
              model: db.bookings,
              as: "booking_data",
            },
          ],
          where: {
            coach_id: coach_id,
            status: 0,
            type: 1
          },
          order: [["id", "DESC"]],
          limit,
          offset, 
        });

        const totalPages = Math.ceil(cancel_classes.count / limit); 
        socket.emit("cancel_classes", {
          message: "Canceled classes fetched successfully",
          classes: cancel_classes.rows,
          currentPage: page, 
          totalPages, 
          totalClasses: cancel_classes.count, 
        });
      } catch (error) {
        console.error("Error fetching canceled classes:", error);

          socket.emit("cancel_classes", {
          message: "Failed to fetch canceled classes",
          error: error.message,
        });
      }
    });

    socket.on("class_request", async (data) => {
      try {
        const isValidToken = await helper.authenticateToken(data.token);

         if (!isValidToken.success) {
          socket.emit("class_request", { message: "Session Expired" });
          return;
        }
        const coach_id = isValidToken.user.id; 

        const currentDate = new Date();
         const currentTime = currentDate.toTimeString().slice(0, 5); // 'HH:MM' format
        const formattedDate1 = currentDate.toISOString().split('T')[0]; // Output: '2025-02-05'
        let { page = 1, limit = 10 } = data;
        page = parseInt(page);
        limit = parseInt(limit);
        const offset = (page - 1) * limit;

        let classes_request = await db.bookings.findAndCountAll({
          include: [
            {
              model: db.users,
              as: "userDetails",
            },
          ],
          where: {
            payment_status: 1,
            booking_status: 0,
            user_id: {
              [Op.ne]: 0, 
            },
            coach_id: coach_id, 
            [Op.or]: [
              {
              
                date1: {
                  [Op.gt]: new Date(formattedDate1),  
                },
              },
              {
                date1: {
                  [Op.eq]: new Date(formattedDate1),  
                }, 
                start_time: {
                  [Op.gte]: currentTime, 
                },
              },
            ],
          },
          order: [
            ["id", "DESC"],
          ],
          limit, 
          offset, 
        });

        const totalPages = Math.ceil(classes_request.count / limit);

        socket.emit("class_request", {
          message: "Class requests fetched successfully",
          classes: classes_request.rows,
          currentPage: page, 
          totalPages: totalPages > 0 ? totalPages : 1,
          totalClasses: classes_request.count, 
        });
      } catch (error) {
        console.error(error);
          socket.emit("class_request", {
          message: "Failed to fetch class requests",
          error: error.message,
        });
      }
    });
    socket.on("notificationlist", async (data) => {
      try {

        const isValidToken = await helper.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("notificationlist", { message: "Session Expired" });
          return;
        }

        let { page = 1, limit = 10 } = data;
        page = parseInt(page);
        limit = parseInt(limit);
        const offset = (page - 1) * limit;
        const receiver_id = isValidToken.user.id;
        await db.notifications.update(
          {
            is_read: 1,
          },
          {
            where: {
              receiver_id: receiver_id,
              is_read: 0,
              deletedAt: null,
            },
          }
        );

        const find_notification = await db.notifications.findAndCountAll({
          include: [
            {
              model: db.users,
              as: "sender",

            },
          ],
          where: {
            receiver_id: receiver_id,
            deletedAt: null,
          },
          order: [["id", "DESC"]],
          limit: limit,
          offset: offset,
        });

        const totalPages = Math.ceil(find_notification.count / limit);
        socket.emit("notificationlist", {
          message: "Notifications fetched successfully",
          notifications: find_notification.rows,
          currentPage: page,
          totalPages,
          totalNotifications: find_notification.count,
        });
      } catch (error) {
        console.error(error);

        socket.emit("notificationlist", {
          message: "Failed to fetch notifications",
          error: error.message,
        });
      }
    });
    socket.on('online_status_match', async (data) => {
      try {
        // Find the room by room_id
        let findroom = await db.rooms.findOne({
          where: { id: data.room_id },
          raw: true
        });

        let user_status_data;
        let updated_status;

        if (data.status === 1) {
          // If status=1, update the online status according to the current online_status
          if (findroom.online_status === 0) {
            updated_status = 1; // 0 -> 1
          } else if (findroom.online_status === 1) {
            updated_status = 2; // 1 -> 2
          } else if (findroom.online_status === 2) {
            updated_status = 1; // 2 -> 1
          }
        } else if (data.status === 0) {
          // If status=0, apply reverse logic
          if (findroom.online_status === 2) {
            updated_status = 1; // 2 -> 1
          } else if (findroom.online_status === 1) {
            updated_status = 0; // 1 -> 0
          }
        }

        // Update the online status in the database
        user_status_data = await db.rooms.update(
          { online_status: updated_status },
          { where: { id: data.room_id } }
        );

        // Fetch the updated room information
        let find_room = await db.rooms.findOne({
          where: { id: data.room_id },
          raw: true
        });

        // Prepare success message
        let success_message = {
          success_message: "Online status updated successfully",
          code: 200,
          data: find_room,
        };

        // Emit the updated online status back to the requesting socket
        socket.emit('online_status_match', success_message);

      } catch (error) {
        console.error("Error updating online status:", error);
        socket.emit("online_status_match", {
          error_message: "Failed to update status",
          code: 500,
          error: error.message
        });
      }
    });
    socket.on('unread_message_count', async (data) => {
      try {

        let notificationCount = await db.chats.count({
          where: {
            is_read: 0,
            receiver_id: data.sender_id
          },
          raw: true
        });

        socket.emit("unread_message_count", {
          success_message: "Unread count retrieved successfully",
          count: notificationCount
        });

      } catch (error) {
        console.log("Error fetching  count:", error);

        const error_message = {
          error_message: "Failed to retrieve notification count",
          code: 500,
          error: error.message
        };

        socket.emit("unread_message_count", error_message);
      }
    });

  });
};
