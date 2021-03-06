var express = require('express');
var multer = require('multer');
var marked = require('marked');
var router = express.Router();
var fs = require('fs');
// var mysql = require('mysql');
// var dbConfig = require('../db/dbConfig.js');
// var pool = mysql.createPool(dbConfig.mysql);
var mongoose = require('mongoose');
// var faceInfo = require('../util/face.js');
var faceInfo = require('../util/qq_face.js');

mongoose.connect('mongodb://root:Winter123@localhost:27017/dong',{ useNewUrlParser: true });

const con = mongoose.connection;

var articleSchema = new mongoose.Schema({
	title:{type:String},
	writer:{type:String},
	brief:{type:String},
	article:{type:String},
	classification:{type:Number,default:1},
	right:{type:Number,default:1},
	isStatic:0,
	time:{type:Date,default:Date.now}
});
var articleModel = con.model("article",articleSchema);

var oneBriefSchema = new mongoose.Schema({
	word:{type:String},
	source:{type:String},
	time:{type:Date,default:Date.now}
});
var oneBriefModel = con.model("oneBrief",oneBriefSchema);

var operationRecordSchema = new mongoose.Schema({
	name:{type:String},
	record:{type:Array},
	time:{type:Date,default:Date.now}
});
var operationRecordModel = con.model("operationRecord",operationRecordSchema);

var createFolder = function(folder){
	try{
		fs.accessSync(folder);
	}catch(e){
		fs.mkdirSync(folder);
	}
};
var uploadFolder = './public/uploads';
createFolder(uploadFolder);
var storage = multer.diskStorage({
	destination:function(req,file,cb){
		cb(null,uploadFolder);
	},
	filename:function(req,file,cb){
		cb(null,file.fieldname + '_' + Date.now()+'.jpg');
	}
});
var upload = multer({storage: storage});
//var connection = mysql.createConnection(dbConfig.mysql);

/* GET home page. */

router.get('/',function(req,res,next){
	articleModel.find({"right":1,"classification":1,"isStatic":1},{title:1,writer:1,brief:1,time:1},{sort:{'time':-1}},function(err,doc){
		console.log(doc);
		for(var i = 0;i < doc.length;i++){
			doc[i].time_string = timeToString(doc[i].time);
		}
		res.render('index',{title:'TD',doc:doc});
	})
});
router.get('/skill',function(req,res,next){
	articleModel.find({"right":1,"classification":1},{title:1,writer:1,brief:1},{sort:{'time':-1}},function(err,doc){
		res.render('index',{title:'TD',doc:doc});
	})
});
router.get('/poemAndInk',function(req,res,next){
	articleModel.find({"right":1,"classification":2},{title:1,writer:1,brief:1},{sort:{'time':-1}},function(err,doc){
		res.render('index',{title:'TD',doc:doc});
	})
});
router.get('/oneBrief',function(req,res,next){
	oneBriefModel.count({},function(err,count){
		console.log(Math.random()*count);
		oneBriefModel.findOne({},{source:1,word:1},{skip:Math.random()*count},function(err,doc){
			console.log(doc)
			res.render('oneBrief',{title:'言语',doc:doc});
		})
	});
});

router.get('/oneBriefAdd',function(req,res,next){
	res.render('admin/oneBriefAdd',{title:'言语录入'})
});

router.get('/oneBriefList',function(req,res,next){
	oneBriefModel.find({},{word:1,source:1,time:1},{},function(err,doc){
		for(var i = 0;i < doc.length;i++){
			doc[i].time_string = timeToString(doc[i].time);
		}
		res.render('admin/oneBriefList',{title:'言语列表',doc:doc});
	});
});

router.get('/oneBriefEdit',function(req,res,next){
	var _id = req.query.id;
	console.log(_id);
	oneBriefModel.find({_id:_id},{source:1,word:1},{},function(err,doc){
		console.log(doc);
		res.render('admin/oneBriefEdit',{doc:doc,title:'言语修改'});
	})
});

router.post('/addOneBrief',function(req,res,next){
	var oneBriefEntity = new oneBriefModel(req.body);
	oneBriefEntity.save(function(err,doc){
		if(err){
			res.send({code:400,msg:'add fail'});
		}else{
			res.send({code:200,msg:'add success!!!'});
		}
	})
});

router.post('/updateOneBrief',function(req,res,next){
	var _id = req.body._id;
	oneBriefModel.update({_id:_id},req.body,{multi:false},function(err,doc){
		if(err){
			res.send({code:400,msg:'add fail'});
		}else{
			res.send({code:200,msg:'add success!!!'});
		}
	})
});

router.get('/admin/add',function(req,res,next){
	res.render('admin/add',{title:'编辑文章'});
});
router.get('/admin/edit',function(req,res,next){
	var id = req.query.id;
	console.log(id);
	articleModel.find({"_id":id},{title:1,writer:1,article:1,brief:1,classification:1,right:1},function(err,doc){
		console.log(doc);
		res.render('admin/edit',{doc:doc});
	});
});

router.get('/admin/list',function(req,res,next){
	articleModel.find({},{title:1,writer:1,isStatic:1},{sort:{'time':-1}},function(err,doc){
		res.render('admin/list',{title:'pageList',doc:doc});
	})
});
router.get('/admin/producePage',function(req,res,next){
	articleModel.find({_id:req.query.id},{title:1,writer:1,article:1,brief:1,classification:1,right:1,isStatic:1},function(err,doc){
		console.log(marked(doc[0].article));
		doc[0].article = marked(doc[0].article);
		res.render('page_template',{doc:doc},function(err,html){
			// html = html.replace(/<script[^>]*>[^<]*?<\/script>/ig,'');
			console.log(html);

			fs.writeFile('./public/page/'+req.query.id+'.html',html,'utf8',function(err){
				if(!err){
					articleModel.update({_id:req.query.id},{isStatic:1},function(err,doc){
						res.send({data:'successfully'});
					})
				}
			})
		})
	})
});
router.get('/admin/delete',function(req,res,next){
	console.log(req.query.id);
	articleModel.remove({"_id":req.query.id},function(err){
		if(err){
			console.log(err);
		}else{
			fs.unlink('./public/page/'+req.query.id+'.html',function(err){
				if(err){
					console.log(err);
				}else{
					console.log('delete is successed!!!');
					res.send({code:200,msg:'delete successfully'});
				}
			})
		}
	})
});


router.post('/addArticle',function(req,res,next){
	var articleEntity = new articleModel(req.body,false);
	articleEntity.save(function(err,doc){
		if(err){
			console.log(err)
		}else{
			res.send({code:200,msg:'Added successfully'});
		}
	})
});
router.post('/editArticle',function(req,res,next){
	console.log(req.body);
	// var articleEntity = new articleModel(req.body);
	articleModel.update({'_id':req.body._id},req.body,function(err,doc){
		if(err){
			console.log({code:400,msg:'add fail'})
		}else{
			res.send({code:200,msg:'Added successfully'});
		}
	})
});


router.get('/page',function(req,res,next){
	articleModel.find({"_id":req.query.id},function(err,doc){
		console.log(doc);
		res.render('page',{doc:doc});
	})
});

// 生成静态文件
router.get('/admin/page',function(req,res,next){
	articleModel.find({"_id":req.query.id},function(err,doc){
		// console.log(doc);
		res.render('page',{doc:doc},function(err,html){
			console.log(html);
			fs.writeFile('public/page/'+req.query.id+'.html',html,'utf8',function(err){
				if(err){

				}else{
					console.log('successfully');
					res.render('successfully');
				}
			})
		});
	})
});


// router.get('/dong',function(req,res,next){
// 	pool.getConnection(function(err,connection){
// 		connection.query("select foot,hostid,color,count(*) as number from pigeon group by foot",function(err,result){
// 			res.json(result);
// 		});
// 		connection.release();
// 	});
// });
// router.get('/why',function(req,res,next){
// 	pool.getConnection(function(err,connection){
// 		connection.query('select sky=? from race where id = ?',['晴',37],function(err,result){
// 			console.log(result);
// 			res.json(result);
// 		})
// 	});
// });
router.post('/face/info',upload.single('pic'),function(req,res,next){
	console.log(req);
    var file = req.file;
    console.log(file);
	faceInfo(res,file.path);
});

router.post('/mdEditor/pic',upload.single('editormd-image-file'),function(req,res,next){
	var file = req.file;
	res.json({url:file.path.replace('public','').replace(/\\/g,'/'),success:1,message:'upload success!'});
});

router.get('/dddd',function(req,res,next){
	var data = 'Hello,guliang,I xihuan ni!';
	fs.writeFile('dong.txt',data,function(err){
		if(err){
			
		}else{
			res.download("dong.txt");
		}
	})
});

router.post('/util/browsingHistory',function(req,res,next){
	console.log(req.body);
	var operationRecordEntity = new operationRecordModel(req.body);
	operationRecordEntity.save(function(err,doc){
		if(err){
			console.log(err)
		}else{
			res.send({code:200,msg:'Added successfully'});
		}
	})
	// res.send({code:200,msg:'Added successfully'});
});

router.get('/util/browsingHistory/record',function(req,res,next){
	console.log(req.query.name);
	operationRecordModel.find({"name":req.query.name},function(err,doc){
		console.log(doc);
		res.send(doc);
	})
});

function timeToString(time){
	let month = parseInt(time.getMonth())+1;
	if(month.toString() < 10){
		month = '0' + month;
	}
	return time.getFullYear()+'-'+month+'-'+time.getDate();
}
module.exports = router;