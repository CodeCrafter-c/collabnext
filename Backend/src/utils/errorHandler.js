const errorHandler=(err,req,res,next)=>{
    const statusCode=err.statusCode||500;

    return res.status(statusCode).json({
        success:false,
        message:err.message||"Internal SERver",
        errors:err.errors||[],
        stack:process.env.MODE=="dev"?err.stack||"":undefined
    })
}

module.exports={
    errorHandler
}