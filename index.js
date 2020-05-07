if (!process.env.now) require("dotenv").config();

const express = require('express');
const cors = require("cors");
const fetch = require('node-fetch');
const app = express();

const port = process.env.now ? 8080 : 4000;

app.use(cors());
app.use(express.json());

let alerts=[];
let errors=[];

app.get('/', (req,res)=>{
	res.json({
		message:'Heyy there! 🤘🏻😎'
	});
});

app.post('/', (req,res)=>{
	alerts = [];
	errors = [];

	let raw_username = (!req.body.username)?sendError('Username cannot be empty!') : req.body.username.toString().toLowerCase().trim();
	const username = raw_username.split(" ").join("");
	
	if(username ==''){
		res.json(sendError('Username cannot be empty!'));
	}
	else{
		fetchProfile(username)
			.then(data=>res.json(data));
	}
});

async function fetchProfile(username){
	let profile = {};
	let posts = [];
	await getProfile(username)
		.then(data=>{profile=data;})
		.catch(err=>console.log(err));

	await getPosts(profile)
		.then(postsData => posts=postsData)
		.catch(error=>console.log(error));
	
	if(errors.length){
		return errors;
	}
	// const posts = await getPosts(profile);
	return({
		profile:profile,
		posts:posts,
		alerts:alerts
	});
}


function sendError(msg){
	let error = {
		status:false,
		html: msg,
		displayLength:5000,
		classes:'red'
	};
	errors.push(error);
}

function sendAlert(msg){
	let alert = {
		status:false,
		html: msg,
		displayLength:4000,
		classes:'orange'
	};
	alerts.push(alert);
}


async function getProfile(username){
	const url = 'https://www.instagram.com/'+username+'/?__a=1';
	let returnData = {};
	await fetch(url)
		.then(response => response.json())
		.then(data => {
			const profile = {
				username: username,
				name: data.graphql.user.full_name,
				id: data.graphql.user.id,
				private: data.graphql.user.is_private,
				profile_pic: data.graphql.user.profile_pic_url_hd
			};
			returnData = profile;
		})
		.catch(error=>sendError('Unable to fetch account details!'));
	return returnData;
}

async function getPosts(profile){
	if(profile.private){
		sendAlert('Connot fetch posts! Profile is private!');
	}
	else{
		
		let postsData = {};
		
		const limit=20000;
		const posts_url = 'https://www.instagram.com/graphql/query/?query_id=17888483320059182&id='+profile.id+'&first='+limit;
		
		await fetch(posts_url)
		.then(posts_response => posts_response.json())
		// .then(data=>console.log(data))
		.then(posts_data => postsData=posts_data)
		.catch(posts_error=>sendAlert('Unable to fetch posts'));

		
		let posts = [];
		await postsData.data.user.edge_owner_to_timeline_media.edges.forEach(post => {
			if(!post.node.is_video){
				let caption = post.node.edge_media_to_caption.edges[0];
				caption = (!caption) ? profile.name : caption.node.text;
				let image = post.node.display_url;
				posts.push({image,caption});
			}
		});
		return posts;
	}
}



app.listen(port);