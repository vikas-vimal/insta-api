if (!process.env.now) require("dotenv").config();

const express = require('express');
const cors = require("cors");
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.now || 4000;

app.use(cors());

app.use(express.json());


app.get('/', (req,res,next)=>{
	// throw new Error("Something went wrong...");
	res.json({
		message:'Heyy there! 🤘🏻😎'
	});
});

app.post('/', (req,res,next)=>{
	// throw new Error("Something went wrong...");
	res.json({
		message:'Heyy there! 🤘🏻😎'
	});
});


app.post('/posts', (req,res)=>{

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


app.post('/profile', (req,res)=>{

	v2_FetchProfile(req.body.username)
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


app.use((req,res,next)=>{
	res.status(404).send({
		status:404,
		error:'Not found!'
	});
});


app.listen(PORT);