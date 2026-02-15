const { google } = require("googleapis");
require("dotenv").config();

const blogger = google.blogger("v3");

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost" // Not strictly used for refresh token auth
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

async function createDraft(title, content, isDraft = true, labels = []) {
    try {
        const res = await blogger.posts.insert({
            auth: oauth2Client,
            blogId: process.env.BLOG_ID,
            isDraft: isDraft, // This parameter controls if it's a draft or published
            requestBody: {
                title: title,
                content: content,
                labels: labels,
            },
        });
        return res.data;
    } catch (error) {
        console.error("Error creating draft details:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        throw error;
    }
}

async function updatePost(postId, title, content) {
    try {
        const res = await blogger.posts.update({
            auth: oauth2Client,
            blogId: process.env.BLOG_ID,
            postId: postId,
            requestBody: {
                title: title,
                content: content,
            },
        });
        return res.data;
    } catch (error) {
        console.error("Error updating post:", error.message);
        throw error;
    }
}

async function getPost(postId) {
    try {
        const res = await blogger.posts.get({
            auth: oauth2Client,
            blogId: process.env.BLOG_ID,
            postId: postId,
        });
        return res.data;
    } catch (error) {
        console.error("Error fetching post:", error.message);
        throw error;
    }
}

async function listPosts(maxResults = 10) {
    try {
        const res = await blogger.posts.list({
            auth: oauth2Client,
            blogId: process.env.BLOG_ID,
            maxResults: maxResults,
        });
        return res.data.items || [];
    } catch (error) {
        console.error("Error listing posts:", error.message);
        throw error;
    }
}

async function deletePost(postId) {
    try {
        await blogger.posts.delete({
            auth: oauth2Client,
            blogId: process.env.BLOG_ID,
            postId: postId,
        });
        return true;
    } catch (error) {
        console.error("Error deleting post:", error.message);
        throw error;
    }
}

module.exports = { createDraft, updatePost, getPost, listPosts, deletePost };
