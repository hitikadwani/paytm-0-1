const express = require('express');

const router = express.Router();
const zod = require("zod");
const { User } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("../middleware");
const { Account } = require("../db")

const signupBody = zod.object({
    username: zod.string().email(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string()
})


router.post("/signup",async (req, res) => {
   const { success } = signupBody.safeParse(req.body);
   if(!success) {
    return res.status(411).json({
        msg: "Email already taken / Incorrect inputs"
    })
   }

   const existingUser = await User.findOne({
    username: req.body.username
   })

   if(existingUser) {
    return res.status(411).json({
        msg: "Email already taken / Incorrect inputs"
    })
   }

   const user = await User.create({
    username: req.body.username,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName
   })

   const userId = user._id;// will be given by db(RHS)
   await Account.create({
    userId,
    balance: 1 + Math.random() * 10000
   })

   const token = jwt.sign({
      userId
   }, JWT_SECRET);

   res.status(200).json({
    msg: "User Created Successfully",
    token: token
   })
})

const signinBody = zod.object({
    username: zod.string().email(),
    password: zod.string()
})

router.post("/signin", async (res, req) => {
   const { success } = signinBody.safeParse(req.body);
   if(!success) {
    return res.status(411).json({
        msg: "Incorrect inputs"
    })
   }

   const user = await User.findOne({
    username: req.body.username,
    password: req.body.password
   });

   if(user) {
      const token = jwt.sign({
        userId:  user._id
      },JWT_SECRET);

      res.json({
        token: token
       })
    
       return;
   }

   res.status(411).json({
    msg: "Error while logging in"
   })

   
})

const updateBody = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.put("/", authMiddleware , async (req, res) => { // authMiddleware will check token of user trying to change credentials
  const { success } = updateBody.safeParse(req.body); 

  if(!success) {
    res.status(411).json({
        msg: "Error while updating information"
    })
  }
  await User.updateOne(req.body, {
    id: req.userId
  })

  res.json({
    msg: "Updated Successfully"
  })
})

router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [{
            firstName: {
                "$regex": filter
            }
        },{
            lastName: {
                "$regex": filter
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
})


module.exports = router;