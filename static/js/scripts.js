document.addEventListener('DOMContentLoaded', function () {
    // Hashtags Chart
    fetch('/api/hashtags')
        .then(response => response.json())
        .then(data => {
            let topHashtags = data.slice(0, 20);
            createHashtagsChart(topHashtags);
        });

    // Influencers Chart
    fetch('/api/influencers')
        .then(response => response.json())
        .then(data => {
            let topInfluencers = data.slice(0, 20);
            createInfluencersChart(topInfluencers);
        });

    // Timeline Chart
    fetch('/api/timeline')
        .then(response => response.json())
        .then(data => {
            createTimelineChart(data);
        });
    // Fetch and display top named entities
    fetch('/api/top_named_entities')
        .then(response => response.json())
        .then(data => {
            createBarChart(data, 'named-entities-chart', 'named_entity', 'Named Entity');
        });

    // Fetch and display top hashtags
    fetch('/api/top_hashtags')
        .then(response => response.json())
        .then(data => {
            createBarChart(data, 'hashtags-bar-chart', 'hashtag', 'Hashtag');
        });
});

// Function to create a bar chart
function createBarChart(data, containerId, labelKey, labelName) {
    let container = document.getElementById(containerId);
    container.className = 'bar-chart';

    // Find the maximum count to set bar widths
    let maxCount = Math.max(...data.map(d => d.count));

    data.forEach(item => {
        let bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.setProperty('--count', item.count);
        bar.style.setProperty('--max-count', maxCount);
        bar.dataset.count = item.count;

        // Set background color based on avg_sentiment
        let avgSentiment = item.avg_sentiment || 0;
        let barColor = sentimentToColor(avgSentiment);
        bar.style.backgroundColor = barColor;

        let title = document.createElement('h4');
        title.className = 'bar-title';
        title.textContent = item[labelKey];
        bar.appendChild(title);

        let countSpan = document.createElement('span');
        countSpan.className = 'bar-count';
        countSpan.textContent = item.count;
        bar.appendChild(countSpan);

        // Content that will be displayed when the bar is expanded
        let content = document.createElement('div');
        content.className = 'bar-content';
        bar.appendChild(content);

        // Add click event to expand/collapse the bar
        bar.addEventListener('click', function() {
            if (bar.classList.contains('expanded')) {
                bar.classList.remove('expanded');
                content.innerHTML = ''; // Clear content
            } else {
                // Collapse any other expanded bars in this chart
                let expandedBars = container.querySelectorAll('.bar.expanded');
                expandedBars.forEach(expandedBar => {
                    expandedBar.classList.remove('expanded');
                    expandedBar.querySelector('.bar-content').innerHTML = '';
                });

                bar.classList.add('expanded');

                // Fetch and display tweets associated with this named entity or hashtag
                let endpoint = labelKey === 'named_entity' ? '/api/tweets_by_named_entity/' : '/api/tweets_by_hashtag/';
                let queryParam = encodeURIComponent(item[labelKey]);
                fetch(endpoint + queryParam)
                    .then(response => response.json())
                    .then(data => {
                        let tweets = data.tweets;
                        if (tweets.length > 0) {
                            tweets.slice(0, 5).forEach(tweet => {
                                let tweetDiv = document.createElement('div');
                                tweetDiv.className = 'tweet';

                                // Color code tweet based on sentiment
                                let sentimentScore = tweet.sentiment_score || 0;
                                let tweetColor = sentimentToColor(sentimentScore);
                                tweetDiv.style.backgroundColor = tweetColor;

                                let tweetText = document.createElement('p');
                                tweetText.className = 'tweet-text';
                                tweetText.textContent = tweet.tweet_text;
                                tweetDiv.appendChild(tweetText);

                                content.appendChild(tweetDiv);
                            });

                            // Add most common hashtags or named entities
                            if (labelKey === 'named_entity') {
                                let commonHashtags = data.common_hashtags;
                                if (commonHashtags.length > 0) {
                                    let hashtagsDiv = document.createElement('div');
                                    hashtagsDiv.className = 'hashtags';
                                    let hashtagsTitle = document.createElement('strong');
                                    hashtagsTitle.textContent = 'Common Hashtags: ';
                                    hashtagsDiv.appendChild(hashtagsTitle);
                                    commonHashtags.forEach(hashtag => {
                                        let hashtagSpan = document.createElement('span');
                                        hashtagSpan.textContent = '#' + hashtag;
                                        hashtagsDiv.appendChild(hashtagSpan);
                                    });
                                    content.appendChild(hashtagsDiv);
                                }
                            } else if (labelKey === 'hashtag') {
                                let commonEntities = data.common_entities;
                                if (commonEntities.length > 0) {
                                    let entitiesDiv = document.createElement('div');
                                    entitiesDiv.className = 'entities';
                                    let entitiesTitle = document.createElement('strong');
                                    entitiesTitle.textContent = 'Common Named Entities: ';
                                    entitiesDiv.appendChild(entitiesTitle);
                                    commonEntities.forEach(entity => {
                                        let entitySpan = document.createElement('span');
                                        entitySpan.textContent = entity;
                                        entitiesDiv.appendChild(entitySpan);
                                    });
                                    content.appendChild(entitiesDiv);
                                }
                            }
                        } else {
                            content.textContent = 'No tweets found.';
                        }
                    });
            }
        });

        container.appendChild(bar);
    });
}

// Function to map sentiment score to color
function sentimentToColor(sentimentScore) {
    // Map sentiment score (-1 to 1) to color
    // Negative sentiment (red): sentimentScore -1
    // Neutral sentiment (grey): sentimentScore 0
    // Positive sentiment (green): sentimentScore +1
    // We'll use HSL color with hue from red (0) to green (120)
    let hue = ((sentimentScore + 1) / 2) * 120; // Map -1..1 to 0..120
    return `hsl(${hue}, 70%, 50%)`; // Saturation 70%, Lightness 50%
}