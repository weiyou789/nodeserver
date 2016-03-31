var http = require('http');
var url = require('url');
var mime = require('mime');
var fs = require("fs");
var path = require("path");
var CONF = require("conf").conf;
var agaconf = require("conf").agent;
var agaent = require("agent");
var handle = require("handle");
var querystring = require("querystring");
mime.isTXT = function(path){
    return /\b(text|xml|javascript|json)\b/.test( this.lookup(path) );
};
function listDirectory(parentDirectory,pathname,req,res){
    var _temp = fs.readFileSync( __dirname + '/html/folder.html','utf-8');
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
            res.end( handle.execute(_temp, __dirname,req,res) );
        }
    })
}
function showFile(filename,req,res,root){
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
function other(req,res,pathurl){
    var agent = agaconf.get(pathurl);
    agaent.execute(req,res,agent,req.url);
}

for(var k in CONF){
    start(CONF[k]);
    console.log("Server running at http://localhost:" + CONF[k].port + '\t[' + k + ']');
}
function start(conf){
    http.createServer(function(req,res){
        var host = (req.headers.host).split(':');
        var root = conf.root;
        var _urlquery = url.parse(req.url).query;
        var pathname = (url.parse(req.url).pathname).substring(1);
        req.util = {
            staticServer: "http://" +  host[0] + ":2850/"
        };
        req.data = querystring.parse(_urlquery);
        if(pathname=='/'){
            listDirectory(root,req,res);
        }else{
            var filename=path.join(root,pathname);
            try{
                fs.stat(filename,function(err,stat){
                if(stat&&stat.isFile()){
                    showFile(filename,req,res,root);
                }else if(stat&&stat.isDirectory()){
                    listDirectory(filename,pathname,req,res);
                }else{
                    other(req,res,pathname)
                   // write404(req,res,root);
                }
            });}
            catch(e){
                write404(req,res,root);
            }
        }
    }).listen(conf.port);
}

