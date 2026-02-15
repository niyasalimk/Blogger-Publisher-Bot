const { generateJobContent } = require("./lib/openrouter");
const { createDraft, updatePost, getPost, listPosts, deletePost } = require("./lib/blogger");
const fs = require("fs");
require("dotenv").config();

async function handlePublishCommand(jobDetails, shouldPublish = false, labels = []) {
    console.log(`🚀 Generating content for: ${jobDetails.title} in ${jobDetails.location}...`);

    try {
        const htmlContent = await generateJobContent(jobDetails);
        console.log("✅ Content generated successfully.");

        console.log(shouldPublish ? "📝 Publishing to Blogger..." : "📝 Drafting to Blogger...");
        const post = await createDraft(`${jobDetails.title} - ${jobDetails.location}`, htmlContent, !shouldPublish, labels);
        console.log(`🎉 Post ${shouldPublish ? 'published' : 'drafted'} successfully!`);
        console.log(`🔗 ID: ${post.id}`);
        console.log(`🔗 URL: ${post.url}`);
        return post;
    } catch (error) {
        console.error("❌ Failed to publish:", error.message);
    }
}

async function handleEditCommand(postId, jobDetailsUpdate) {
    console.log(`🔍 Fetching post ${postId}...`);
    try {
        const existingPost = await getPost(postId);
        console.log(`✅ Found post: ${existingPost.title}`);

        console.log("🚀 Generating updated content...");
        const htmlContent = await generateJobContent(jobDetailsUpdate);

        console.log("📝 Updating Blogger post...");
        const updated = await updatePost(postId, existingPost.title, htmlContent);
        console.log(`🎉 Post updated successfully!`);
        console.log(`🔗 URL: ${updated.url}`);
    } catch (error) {
        console.error("❌ Failed to edit:", error.message);
    }
}

async function handleListCommand(max = 10) {
    console.log(`🔍 Listing last ${max} posts...`);
    try {
        const posts = await listPosts(max);
        if (posts.length === 0) {
            console.log("No posts found.");
            return;
        }
        console.table(posts.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            published: p.published
        })));
    } catch (error) {
        console.error("❌ Failed to list posts:", error.message);
    }
}

async function handleDeleteCommand(postId) {
    console.log(`🗑️ Deleting post ${postId}...`);
    try {
        await deletePost(postId);
        console.log(`✅ Post deleted successfully.`);
    } catch (error) {
        console.error("❌ Failed to delete post:", error.message);
    }
}

async function handleBatchCommand(filePath, isDraft = true) {
    console.log(`📦 Starting batch process from ${filePath}...`);
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!Array.isArray(data)) {
            throw new Error("Batch file must contain a JSON array of job objects.");
        }

        console.log(`📋 Found ${data.length} jobs to process.`);
        for (const [index, job] of data.entries()) {
            console.log(`\n[${index + 1}/${data.length}] Processing: ${job.title}...`);
            await handlePublishCommand(
                {
                    title: job.title,
                    location: job.location,
                    requirements: job.requirements,
                    company: job.company,
                    salary: job.salary,
                    applyLink: job.applyLink,
                    applyEmail: job.applyEmail,
                    interviewDate: job.interviewDate,
                    interviewTime: job.interviewTime,
                    interviewLocation: job.interviewLocation,
                    type: job.type
                },
                !isDraft,
                job.labels || []
            );
            // Small delay to avoid API rate limits
            if (index < data.length - 1) {
                console.log("⏳ Waiting 2 seconds before next job...");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        console.log("\n✅ Batch process completed!");
    } catch (error) {
        console.error("❌ Failed batch process:", error.message);
    }
}

function getFlagValue(args, flagNames) {
    for (const flag of flagNames) {
        const index = args.indexOf(flag);
        if (index !== -1 && args[index + 1]) {
            return { value: args[index + 1], flagIndex: index };
        }
    }
    return null;
}

const args = process.argv.slice(2);
const isPublishFlag = args.includes("--publish");
const labelsData = getFlagValue(args, ["--labels"]);
const linkData = getFlagValue(args, ["--link", "--apply-link"]);
const emailData = getFlagValue(args, ["--email", "--apply-email"]);
const dateData = getFlagValue(args, ["--date"]);
const timeData = getFlagValue(args, ["--time"]);
const venueData = getFlagValue(args, ["--venue", "--interview-location"]);

let labels = labelsData ? labelsData.value.split(",").map(l => l.trim()) : [];
let applyLink = linkData ? linkData.value : null;
let applyEmail = emailData ? emailData.value : null;
let interviewDate = dateData ? dateData.value : null;
let interviewTime = timeData ? timeData.value : null;
let interviewLocation = venueData ? venueData.value : null;

let skipIndices = [];
if (isPublishFlag) skipIndices.push(args.indexOf("--publish"));
if (labelsData) skipIndices.push(labelsData.flagIndex, labelsData.flagIndex + 1);
if (linkData) skipIndices.push(linkData.flagIndex, linkData.flagIndex + 1);
if (emailData) skipIndices.push(emailData.flagIndex, emailData.flagIndex + 1);
if (dateData) skipIndices.push(dateData.flagIndex, dateData.flagIndex + 1);
if (timeData) skipIndices.push(timeData.flagIndex, timeData.flagIndex + 1);
if (venueData) skipIndices.push(venueData.flagIndex, venueData.flagIndex + 1);

const filteredArgs = args.filter((_, index) => !skipIndices.includes(index));
const command = filteredArgs[0];

if (command === "publish") {
    const [_, title, location, requirements, company, salary] = filteredArgs;
    if (!title || !location || !requirements) {
        console.log("Usage: node publisher.js publish <title> <location> <requirements> [company] [salary] [--publish] [--labels L1,L2] [--link URL] [--email EMAIL] [--date DATE] [--time TIME] [--venue VENUE]");
        process.exit(1);
    }
    handlePublishCommand({ title, location, requirements, company, salary, applyLink, applyEmail, interviewDate, interviewTime, interviewLocation }, isPublishFlag, labels);
} else if (command === "edit") {
    const [_, postId, title, location, requirements, company, salary] = filteredArgs;
    if (!postId || !title || !location || !requirements) {
        console.log("Usage: node publisher.js edit <postId> <title> <location> <requirements> [company] [salary] [--link URL] [--email EMAIL] [--date DATE] [--time TIME] [--venue VENUE]");
        process.exit(1);
    }
    handleEditCommand(postId, { title, location, requirements, company, salary, applyLink, applyEmail, interviewDate, interviewTime, interviewLocation });
} else if (command === "list") {
    const max = filteredArgs[1] || 10;
    handleListCommand(max);
} else if (command === "delete") {
    const postId = filteredArgs[1];
    if (!postId) {
        console.log("Usage: node publisher.js delete <postId>");
        process.exit(1);
    }
    handleDeleteCommand(postId);
} else if (command === "batch") {
    const filePath = filteredArgs[1];
    if (!filePath) {
        console.log("Usage: node publisher.js batch <filePath.json> [--publish]");
        process.exit(1);
    }
    handleBatchCommand(filePath, !isPublishFlag);
} else {
    console.log("Blogger Publisher Bot");
    console.log("Available commands:");
    console.log("  publish <title> <location> <requirements> [company] [salary] [--publish] [--labels L1,L2] [--link URL] [--email EMAIL] [--date DATE] [--time TIME] [--venue VENUE]");
    console.log("  edit <postId> <title> <location> <requirements> [company] [salary] [--link URL] [--email EMAIL] [--date DATE] [--time TIME] [--venue VENUE]");
    console.log("  list [maxResults]");
    console.log("  delete <postId>");
    console.log("  batch <filePath.json> [--publish]");
}
