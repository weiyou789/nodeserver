var http = require('http');
var url = require('url');
var mime = require('mime');
var fs = require("fs");
var path = require("path");
var root=__dirname;
var handle = require("handle");
var querystring = require("querystring");
var port = 8973;
mime.isTXT = function(path){
    return /\b(text|xml|javascript|json)\b/.test( this.lookup(path) );
};
function listDirectory(parentDirectory,pathname,req,res){
    var _temp = fs.readFileSync( root + '/html/folder.html','utf-8');
    fs.readdir(parentDirectory,function(err,files){
        if(err){
            res.writeHead(500, {"Content-Type": mime.lookup( ".json" )});
            res.end( JSON.stringify( err ) )
        }else{
            res.writeHead(200,{
                "Content-Type":"text/html;charset=utf-8",
                //"Content-Length":Buffer.byteLength(body,'utf8'),
                "Server":"NodeJs("+process.version+")"
            });
            req.info = {
                files: files,   //文件(夹)列表
                title: parentDirectory,    //标题显示
                parent: parentDirectory.match(/[\\\/]$/) ? "../" : "./",   //根据结尾分隔符处理回到上级目录链接
                base: "/"+pathname.replace(/(\w+)$/,"$1/")  //拼接目录链接和文件(夹)的绝对路径
            };
            res.end( handle.execute(_temp, root,req,res) );
        }
    })
}
function showFile(filename,req,res){
    var contentType = mime.lookup(filename) || "text/plain";
    res.writeHead(200,{
        "Content-Type":contentType,
        //"Content-Length":Buffer.byteLength(file),
        "Server":"NodeJs("+process.version+")"
    });
    var rs = fs.createReadStream(filename),str='';
    rs.on('error',function(err){
        throw err;
    }).on('data',function(d){
        str += d;
    });
    if(mime.isTXT(filename)){
        rs.on('end',function(){
            str = handle.execute(str, root,req,res);
            res.end( str );
        })
    }else{
        rs.pipe(res);
    }
}
function write404(req,res){
    var body="没找到文件:-(";
    res.writeHead(404,{
        "Content-Type":"text/html;charset=utf-8",
        //"Content-Length":Buffer.byteLength(body,'utf8'),
        "Server":"NodeJs("+process.version+")"
    });
    res.write(body);
    res.end();
}
http.createServer(function(req,res){
    var host = req.headers.host;
    var _urlquery = url.parse(req.url).query;
    var pathname = (url.parse(req.url).pathname).substring(1);
    req.util = {
        staticServer: "http://" +  host + "/"
    };
    req.data = querystring.parse(_urlquery);
    if(pathname=='/'){
        listDirectory(root,req,res);
    }else{
        var filename=path.join(root,pathname);
        fs.stat(filename,function(err,stat){
            if(stat.isFile()){
                showFile(filename,req,res);
            }else if(stat.isDirectory()){
                listDirectory(filename,pathname,req,res);
            }else{
                write404(req,res);
            }
        });
    }
}).listen(port);
console.log('Server running at http://localhost:8973/')