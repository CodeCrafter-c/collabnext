const { v4: uuid } = require("uuid");
const jwt=require("jsonwebtoken");
const crypto = require("crypto");


const accessTokenSecret=process.env.ACCESS_TOKEN_SECRET
const refreshTokenSecret=process.env.REFRESH_TOKEN_SECRET
const accessExpiry=ACCESS_TOKEN_EXPIRY;
const refreshExpiry=REFRESH_TOKEN_EXPIRY;

const createAcessToken=function(payload){
    return jwt.sign(payload,accessTokenSecret,{
        expiresIn:accessExpiry,
        algorithm:"HS256"
    })
}

const  createRefreshToken=function(payload){

    const jti=uuid()

    const token= jwt.sign({...payload,jti},refreshTokenSecret,{
        expiresIn:refreshExpiry,
        algorithm:"HS256"
    });

    return {token,jti}
}

const verifyAccessToken=function(token){
    return jwt.verify(token,accessTokenSecret)
}

const verifyRefreshToken=function(token){
    return jwt.verify(token,refreshTokenSecret)
}


const createResetPasswordToken=function(){
    return crypto.randomBytes(32).toString("hex")
}


module.exports={
    createAcessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    createResetPasswordToken,
}