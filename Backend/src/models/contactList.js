const mongoose = require("mongoose");

const contactListSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // the user who owns this list
      required: true,
    },
    listName: {
      type: String,
      required: true,
      trim: true,
      default: "ungrouped" /* all those who are not addeed to the list ,
                               to keep track of invites sent*/,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        nickname: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "blocked"],
          default: "pending",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ContactList = mongoose.model("ContactList", contactListSchema);

module.exports = { ContactList };
