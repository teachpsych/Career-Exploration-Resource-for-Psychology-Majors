const jobslist = document.getElementById('jobslist');
const searchBar = document.getElementById('searchBar');
const mainCategory = document.getElementById('mainCategory');
const videoContainer = document.getElementById('video-container');
let jobData = [];

// Event listener for the search bar
searchBar.addEventListener('keyup', (e) => {
    const searchString = e.target.value.toLowerCase();
    const searchWords = searchString.split(' ').filter(word => word.length > 0);

    if (searchWords.length === 0) {
        displayJobs(jobData.flatMap(category => {
            return Object.entries(category.jobs).map(([jobTitle, job]) => ({
                main_category: category.main_category,
                jobTitle,
                job
            }));
        }));
        return;
    }

    const filteredJobs = jobData.flatMap(category => {
        return Object.entries(category.jobs)
            .filter(([jobTitle, job]) => {
                const jobTitleMatch = searchWords.some(word => jobTitle.toLowerCase().includes(word));
                const linksMatch = job.links.some(link =>
                    searchWords.some(word => 
                        link.url.toLowerCase().includes(word) || 
                        link.category.toLowerCase().includes(word)
                    )
                );
                return jobTitleMatch || linksMatch;
            })
            .map(([jobTitle, job]) => ({
                main_category: category.main_category,
                jobTitle,
                job
            }));
    });

    displayJobs(filteredJobs);
});

// Function to load jobs data
const loadJobs = async () => {
    try {
        const res = await fetch('jobs.json'); // Adjust the path if necessary
        jobData = await res.json(); // Load all categories and jobs
        displayJobs(jobData.flatMap(category => {
            return Object.entries(category.jobs).map(([jobTitle, job]) => ({
                main_category: category.main_category,
                jobTitle,
                job
            }));
        }));
        await loadVideos(); // Load videos after jobs are loaded
    } catch (err) {
        console.error(err);
    }
};

// Function to display jobs
const displayJobs = (jobs) => {
    let lastCategory = '';

    const htmlString = jobs
        .map(({ main_category, jobTitle, job }) => {
            const isNewCategory = main_category !== lastCategory;
            lastCategory = main_category;

            const linksHtml = job.links
                .map(link => {
                    if (link.url.includes('youtube.com/watch')) {
                        const videoId = extractVideoId(link.url);
                        return `
                            <li class="link video">
                                <iframe width="560" height="315" 
                                        src="https://www.youtube.com/embed/${videoId}?si=XTUu8vUPdTepSLYV" 
                                        title="YouTube video player" 
                                        frameborder="0" 
                                        loading="lazy" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                        referrerpolicy="strict-origin-when-cross-origin" 
                                        allowfullscreen>
                                </iframe>
                            </li>
                        `;
                    } else {
                        return `
                            <li class="link">
                                <span class="category">${link.category}</span>
                                <a href="${link.url}" target="_blank">${link.url}</a>
                            </li>
                        `;
                    }
                })
                .join('');

            return `
                ${isNewCategory ? `<h2 class="main-category">${main_category}</h2>` : ''}
                <div class="job-section">
                    <h3 class="job-title">${jobTitle}</h3>
                    <ul class="links-list">
                        ${linksHtml}
                    </ul>
                </div>
            `;
        })
        .join('');

    jobslist.innerHTML = htmlString;
    updateMainCategory(jobs);
};

// Function to update the main category display
const updateMainCategory = (jobs) => {
    const firstJob = jobs[0];
    if (firstJob) {
        mainCategory.textContent = firstJob.main_category;
    } else {
        mainCategory.textContent = ''; // Clear the main category if no jobs
    }
};

// Function to load videos data
const loadVideos = async () => {
    try {
        const res = await fetch('videos.json'); // Adjust the path if necessary
        const videoData = await res.json();
        displayVideos(videoData);
    } catch (err) {
        console.error(err);
    }
};

// Function to display videos
const displayVideos = (videos) => {
    const htmlString = videos
        .map(video => {
            const videoId = extractVideoId(video.url);
            return `
                <iframe width="560" height="315" 
                        src="https://www.youtube.com/embed/${videoId}?si=XTUu8vUPdTepSLYV" 
                        title="YouTube video player" 
                        frameborder="0" 
                        loading="lazy" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        referrerpolicy="strict-origin-when-cross-origin" 
                        allowfullscreen>
                </iframe>
            `;
        })
        .join('');
    videoContainer.innerHTML = htmlString;
};

// Function to extract the YouTube video ID from the URL
const extractVideoId = (url) => {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v') || url.split('/').pop();
};

// Load jobs and videos data when the page is ready
document.addEventListener('DOMContentLoaded', loadJobs);
