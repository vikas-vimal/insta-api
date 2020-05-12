if (!process.env.now) require("dotenv").config();

const express = require('express');
const cors = require("cors");
const fetch = require('node-fetch');
const app = express();

const port = process.env.now ? process.env.now : 4000;

app.use(cors());
app.use(express.json());

let alerts=[];
let errors=[];

app.get('/', (_req,res)=>{
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




app.post('/v2/posts/', (req,res)=>{

	const next_cursor = (!req.body.next)? '' : '&after='+req.body.next.toString().trim();
	let posts_api = 'https://www.instagram.com/graphql/query/?query_id=17888483320059182';
	
	let profile = {};
	let fetching_profile = v2_FetchProfile(req.body.username)
		.then(fetched_profile => {
			profile = fetched_profile;
			return fetched_profile;
		})
		.catch(err=>res.json({error: "Something went wrong!"}));

	
	fetching_profile
		.then(profile=>{
				posts_api = posts_api + "&id="+profile.profile.id + "&first=20" + next_cursor;
				return (profile.profile.private) ? false : fetch(posts_api);
		})
		.then(posts_response => {
			if	(posts_response === false){
				return false;
			}else{
				return posts_response.json();
			}
		})
		.then(postsData => {

			if	(postsData==false){
				res.json({error:"Profile is private cannot fetch posts!"});
			}
			else{	
				
				let posts = [];
				postsData.data.user.edge_owner_to_timeline_media.edges.forEach(post => {
					if(!post.node.is_video){
						let caption = post.node.edge_media_to_caption.edges[0];
						caption = (!caption) ? profile.profile.name : caption.node.text;
						posts.push({
							caption: caption,
							image: post.node.display_url
						});
					}
				});

				let res_obj = {
					no_of_posts: posts.length,
					has_next_page: postsData.data.user.edge_owner_to_timeline_media.page_info.has_next_page,
					next: postsData.data.user.edge_owner_to_timeline_media.page_info.end_cursor,
					data: posts
				}

				res.json(res_obj);

			}
		})
		.catch(err => {
			res.json({ error: "Unable to retrieve posts!" });
		});

});


app.post('/v2/profile/', (req,res)=>{

	let fetching_profile = v2_FetchProfile(req.body.username)
		.then(r=>res.json(r))
		.catch(err=>res.json({error: "Something went wrong!"}));

});



async function v2_FetchProfile(raw_username){
	
	const username = (!raw_username) ? '' : raw_username
		.toString()
		.toLowerCase()
		.trim()
		.split(" ")
		.join("");
	
	if(!username || username == ''){ return { error: "Username cannot be empty!" }; }
	else {

		const profile_api = 'https://www.instagram.com/'+username+'/?__a=1';

		let response = await fetch(profile_api);
		let data = await response.json();
		let res_obj = {
			username: username,
			name: data.graphql.user.full_name,
			id: data.graphql.user.id,
			private: data.graphql.user.is_private,
			profile_pic: data.graphql.user.profile_pic_url_hd,
			posts_count: data.graphql.user.edge_owner_to_timeline_media.count,
			has_next_page: data.graphql.user.edge_owner_to_timeline_media.page_info.has_next_page
		}
		return {profile: res_obj};
	}
}



async function fetchProfile(_user_id){
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
		.catch(_error=>sendError('Unable to fetch account details!'));
	return returnData;
}

async function getPosts(profile, _page=''){
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
		.catch(_posts_error=>sendAlert('Unable to fetch posts'));

		
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



app.listen(port, () => {
	console.log("http://localhost:"+port);
});