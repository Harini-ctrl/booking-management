import { Request, Response } from "express";
import User from "../models/user.model";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const addUser = async (req: Request, res: Response) => {
  console.log(req.body);
    try {
        const findUser = await User.find({ email: req.body.email });
        if (findUser.length > 0) {
            res.status(400).json({ message: "User already exists" });
        } else {
            const user = new User(req.body);
            await user.save();
            res.json(user);
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
}