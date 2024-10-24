// careers can be entered with a bachelor’s degree (highlighted in BLUE), 
// and those whose careers require a graduate degree (highlighted in GREEN).

const jobslist = document.getElementById('jobslist');
const searchBar = document.getElementById('searchBar');
const mainCategory = document.getElementById('mainCategory');
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
    } catch (err) {
        console.error(err);
    }
};

// Function to display jobs
// Function to display jobs
const displayJobs = (jobs) => {
    let lastCategory = '';
    const htmlString = jobs.map(({ main_category, jobTitle, job }) => {
        const isNewCategory = main_category !== lastCategory;
        lastCategory = main_category;

        const linksHtml = job.links.map(link => {
            return `
                <li class="link">
                    <span class="category">${link.category}</span>
                    <a href="${link.url}" target="_blank">${link.url}</a>
                </li>
            `;
        }).join('');

        // Add margin between video containers
        const videosHtml = job.videos.map(video => {
            const videoId = extractVideoId(video.url);
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            return `
                <div class="video-wrapper" data-video-id="${videoId}" style="margin-bottom: 20px;"> <!-- Added margin-bottom for spacing -->
                    <img src="${thumbnailUrl}" class="video-thumbnail" alt="Video thumbnail" style="cursor: pointer;" />
                </div>
            `;
        }).join(''); // Each video gets a bottom margin to create space between them

        return `
            ${isNewCategory ? `<h2 class="main-category">${main_category}</h2>` : ''}
            <div class="job-section">
                <h3 class="job-title">${jobTitle}</h3>
                <ul class="links-list">${linksHtml}</ul>
                <div class="videos-container">${videosHtml}</div>
            </div>
        `;
    }).join('');

    jobslist.innerHTML = htmlString;
    updateMainCategory(jobs);

    // Add event listeners for lazy loading videos
    document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            const videoWrapper = this.closest('.video-wrapper');
            const videoId = videoWrapper.dataset.videoId;

            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', true);
            iframe.setAttribute('loading', 'lazy'); // Enables lazy loading for the iframe

            videoWrapper.innerHTML = ''; // Clear the thumbnail
            videoWrapper.appendChild(iframe); // Replace with the iframe

            // Track video visibility
            observeVideo(videoWrapper, iframe);
        });
    });
};


// Function to observe and pause the video when out of view
function observeVideo(videoWrapper, iframe) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        });
    });

    observer.observe(videoWrapper);
}

// Function to update the main category display
const updateMainCategory = (jobs) => {
    const firstJob = jobs[0];
    if (firstJob) {
        mainCategory.textContent = firstJob.main_category;
    } else {
        mainCategory.textContent = ''; // Clear the main category if no jobs
    }
};

// Function to extract the YouTube video ID from the URL
const extractVideoId = (url) => {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v') || url.split('/').pop();
};

// Load jobs data when the page is ready
document.addEventListener('DOMContentLoaded', loadJobs);
