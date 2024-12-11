document.addEventListener('DOMContentLoaded', function () {

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

    // Fetch and display top users
    fetch('/api/top_users')
        .then(response => response.json())
        .then(data => {


            populateTopUsersTable(data);
        });

    fetch('/api/top_mentions')
        .then(response => response.json())
        .then(data => {


            createBarChart(data, 'mentions-bar-chart', 'mention', 'Mention');
        });
    // Fetch and display tweet volume over time
    fetch('/api/tweet_counts_by_month')
        .then(response => response.json())
        .then(data => {

            createTimeBarChart(data, 'tweet-volume-chart', 'month_year', 'Tweet Volume');
        });

    // Fetch and display account locations heatmap
    fetch('/api/account_locations')
        .then(response => response.json())
        .then(data => {
            createAccountHeatmap(data);
        });

    fetch('/api/summary_statistics')
        .then(response => response.json())
        .then(data => {
            displaySummaryStatistics(data);
        });
    // Fetch and display language distribution bubble chart
    fetch('/api/language_distribution')
        .then(response => response.json())
        .then(data => {
            createLanguageBubbleChart(data);
        });
        

    // Fetch and display average word length histogram
    fetch('/api/avg_word_length_histogram')
        .then(response => response.json())
        .then(data => {
            createHistogram(data, 'avg-word-length-chart', 'avg_word_length', 'frequency', 'Average Word Length', 'Number of Tweets');
        });

    // Handle search form submission
    const searchForm = document.getElementById('search-form');
    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const query = document.getElementById('search-input').value;
        if (query.trim() === '') {
            alert('Please enter a search query.');
            return;
        }
        performSearch(query);
    });

});
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
        bar.addEventListener('click', function () {
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

                // Fetch and display data associated with this item
                let endpoint;
                if (labelKey === 'named_entity') {
                    endpoint = '/api/tweets_by_named_entity/';
                    searchQuery = `named_entity:"${item[labelKey]}"`;

                } else if (labelKey === 'hashtag') {
                    endpoint = '/api/tweets_by_hashtag/';
                    searchQuery = `hashtags:"${item[labelKey]}"`;

                } else if (labelKey === 'mention') {
                    endpoint = '/api/tweets_by_mention/';
                    searchQuery = `mentions:"${item[labelKey]}"`;
                }
                let queryParam = encodeURIComponent(item[labelKey]);
                fetch(endpoint + queryParam)
                    .then(response => response.json())
                    .then(data => {
                        // Display Summary
                        let summaryDiv = document.createElement('div');
                        summaryDiv.className = 'summary';

                        let statsDiv = document.createElement('div');
                        statsDiv.className = 'stats';
                        statsDiv.innerHTML = `<strong>Summary Stats:</strong> Likes: ${data.total_likes}, Retweets: ${data.total_retweets}`;

                        // Add the button to perform the search on the same page 
                        let searchButton = document.createElement('button');
                        searchButton.className = 'btn btn-secondary float-right';
                        searchButton.textContent = 'View all matching tweets';

                        searchButton.addEventListener('click', function () {
                            // Set the search input value
                            document.getElementById('search-input').value = searchQuery;
                            // Perform the search
                            performSearch(searchQuery);
                            // Optionally, scroll to the search results section
                            document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
                        });

                        summaryDiv.appendChild(searchButton);

                        summaryDiv.appendChild(statsDiv);

                        if (data.cooccurring_users.length > 0) {
                            let mentionsDiv = document.createElement('div');
                            mentionsDiv.className = 'cooccurring-users';
                            let mentionsTitle = document.createElement('strong');
                            mentionsTitle.textContent = 'Co-occurring Users Mentioned: ';
                            mentionsDiv.appendChild(mentionsTitle);
                            data.cooccurring_users.forEach(user => {
                                let userSpan = document.createElement('span');
                                userSpan.textContent = '@' + user;
                                mentionsDiv.appendChild(userSpan);
                            });
                            summaryDiv.appendChild(mentionsDiv);
                        }

                        if (data.cooccurring_hashtags.length > 0) {
                            let hashtagsDiv = document.createElement('div');
                            hashtagsDiv.className = 'cooccurring-hashtags';
                            let hashtagsTitle = document.createElement('strong');
                            hashtagsTitle.textContent = 'Co-occurring Hashtags: ';
                            hashtagsDiv.appendChild(hashtagsTitle);
                            data.cooccurring_hashtags.forEach(hashtag => {
                                let hashtagSpan = document.createElement('span');
                                hashtagSpan.textContent = '#' + hashtag;
                                hashtagsDiv.appendChild(hashtagSpan);
                            });
                            summaryDiv.appendChild(hashtagsDiv);
                        }

                        content.appendChild(summaryDiv);

                        const heatmapDiv = document.createElement('div');
                        heatmapDiv.className = 'heatmap';

                        // Create heatmap visualization
                        createHeatmap(heatmapDiv, data.hourly_counts);

                        content.appendChild(heatmapDiv);

                        // Display Tweets
                        if (data.tweets.length > 0) {
                            // Create table for tweets
                            let tweetsTable = document.createElement('table');
                            tweetsTable.className = 'tweets-table';

                            // Table header
                            let thead = document.createElement('thead');
                            thead.innerHTML = `
                                <tr>
                                    <th data-sort="string">User</th>
                                    <th data-sort="string">Language</th>
                                    <th data-sort="int">Likes</th>
                                    <th data-sort="int">Retweets</th>
                                    <th>Tweet</th>
                                </tr>
                            `;
                            tweetsTable.appendChild(thead);

                            // Table body
                            let tbody = document.createElement('tbody');
                            data.tweets.slice(0, 10).forEach(tweet => {
                                let row = document.createElement('tr');

                                let trimmedUsername = tweet.user_screen_name.length > 20 ? tweet.user_screen_name.substring(0, 20) + '…' : tweet.user_screen_name;

                                row.innerHTML = `
                                    <td>${trimmedUsername}</td>
                                    <td>${tweet.tweet_language}</td>
                                    <td>${tweet.like_count}</td>
                                    <td>${tweet.retweet_count}</td>
                                    <td class="tweet-text">${highlightText(tweet.tweet_text)}</td>
                                `;

                                // Color code tweet based on sentiment
                                let sentimentScore = tweet.sentiment_score || 0;
                                let tweetColor = sentimentToColor(sentimentScore);
                                row.style.backgroundColor = tweetColor;

                                tbody.appendChild(row);
                            });
                            tweetsTable.appendChild(tbody);

                            // Add sortable functionality to the table
                            makeTableSortable(tweetsTable);

                            content.appendChild(tweetsTable);
                        } else {
                            content.textContent = 'No tweets found.';
                        }
                    });
            }
        });

        container.appendChild(bar);
    });
}
function sentimentToColor(sentimentScore) {
    //if sentiment score is null, return grey color
    if (sentimentScore === null) {
        return 'lightgrey';
    }

    // Transform the sentiment score to exaggerate extremes
    let amplifiedScore = Math.sign(sentimentScore) * Math.pow(Math.abs(sentimentScore), .6); // Exponent > 1 pushes extremes

    // Map amplified sentiment score to hue
    let hue = ((amplifiedScore + 1) / 2) * 120; // Still maps -1 to 1 to 0 to 120 degrees

    return `hsl(${hue}, 70%, 80%)`; // Saturation 70%, Lightness 80%
}

function populateTopUsersTable(data) {
    const tableBody = document.querySelector('#top-users-table tbody');

    data.forEach(user => {
        const row = document.createElement('tr');
        row.classList.add('user-row');
        row.innerHTML = `
            <td>${user.user}</td>
            <td>${user.tweet_volume}</td>
            <td>${user.like_count}</td>
            <td>${user.retweet_count}</td>
            <td>${user.follower_count}</td>
        `;

        // Add click event to expand/collapse the row
        row.addEventListener('click', function () {
            // Check if the row is already expanded
            const isExpanded = row.classList.contains('expanded');

            // Collapse any other expanded rows
            const expandedRows = document.querySelectorAll('#top-users-table tr.expanded');
            expandedRows.forEach(expandedRow => {
                expandedRow.classList.remove('expanded');
                const nextRow = expandedRow.nextElementSibling;
                if (nextRow && nextRow.classList.contains('expandable-row')) {
                    nextRow.remove();
                }
            });

            if (!isExpanded) {
                row.classList.add('expanded');

                // Fetch user details
                const username = encodeURIComponent(user.user);
                fetch('/api/user_details/' + username)
                    .then(response => response.json())
                    .then(data => {
                        let searchQuery = `user:"${username}"`;

                        // Create a new row for expanded content
                        const expandRow = document.createElement('tr');
                        expandRow.classList.add('expandable-row');
                        const expandCell = document.createElement('td');
                        expandCell.colSpan = 5;

                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'user-content';

                        // Display Summary
                        const summaryDiv = document.createElement('div');
                        summaryDiv.className = 'summary';

                        const statsDiv = document.createElement('div');
                        statsDiv.className = 'stats';
                        statsDiv.innerHTML = `<strong>Summary Stats:</strong> Likes: ${data.total_likes}, Retweets: ${data.total_retweets}`;

                        // Add the button to perform the search on the same page 
                        let searchButton = document.createElement('button');
                        searchButton.className = 'btn btn-secondary float-right';
                        searchButton.textContent = 'View all matching tweets';

                        searchButton.addEventListener('click', function () {
                            // Set the search input value
                            document.getElementById('search-input').value = searchQuery;
                            // Perform the search
                            performSearch(searchQuery);
                            // Optionally, scroll to the search results section
                            document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
                        });

                        summaryDiv.appendChild(searchButton);
                        summaryDiv.appendChild(statsDiv);

                        if (data.cooccurring_users.length > 0) {
                            const mentionsDiv = document.createElement('div');
                            mentionsDiv.className = 'cooccurring-users';
                            const mentionsTitle = document.createElement('strong');
                            mentionsTitle.textContent = 'Co-occurring Users Mentioned: ';
                            mentionsDiv.appendChild(mentionsTitle);
                            data.cooccurring_users.forEach(user => {
                                const userSpan = document.createElement('span');
                                userSpan.textContent = '@' + user;
                                mentionsDiv.appendChild(userSpan);
                            });
                            summaryDiv.appendChild(mentionsDiv);
                        }

                        if (data.top_hashtags.length > 0) {
                            const hashtagsDiv = document.createElement('div');
                            hashtagsDiv.className = 'cooccurring-hashtags';
                            const hashtagsTitle = document.createElement('strong');
                            hashtagsTitle.textContent = 'Co-occurring Hashtags: ';
                            hashtagsDiv.appendChild(hashtagsTitle);
                            data.top_hashtags.forEach(hashtag => {
                                const hashtagSpan = document.createElement('span');
                                hashtagSpan.textContent = '#' + hashtag;
                                hashtagsDiv.appendChild(hashtagSpan);
                            });
                            summaryDiv.appendChild(hashtagsDiv);
                        }

                        contentDiv.appendChild(summaryDiv);

                        const heatmapDiv = document.createElement('div');
                        heatmapDiv.className = 'heatmap';

                        // Create heatmap visualization
                        createHeatmap(heatmapDiv, data.hourly_counts);

                        contentDiv.appendChild(heatmapDiv);

                        // Display Tweets in a sortable table
                        if (data.tweets.length > 0) {
                            const tweetsTable = document.createElement('table');
                            tweetsTable.className = 'tweets-table';

                            const thead = document.createElement('thead');
                            thead.innerHTML = `
                                <tr>
                                    <th data-sort="string">Language</th>
                                    <th data-sort="int">Likes</th>
                                    <th data-sort="int">Retweets</th>
                                    <th>Tweet</th>
                                </tr>
                            `;
                            tweetsTable.appendChild(thead);

                            const tbody = document.createElement('tbody');
                            data.tweets.slice(0, 10).forEach(tweet => {
                                const tweetRow = document.createElement('tr');

                                tweetRow.innerHTML = `
                                    <td>${tweet.tweet_language}</td>
                                    <td>${tweet.like_count}</td>
                                    <td>${tweet.retweet_count}</td>
                                    <td class="tweet-text">${highlightText(tweet.tweet_text)}</td>
                                `;

                                // Color code tweet based on sentiment
                                const sentimentScore = tweet.sentiment_score || 0;
                                const tweetColor = sentimentToColor(sentimentScore);
                                tweetRow.style.backgroundColor = tweetColor;

                                tbody.appendChild(tweetRow);
                            });
                            tweetsTable.appendChild(tbody);

                            // Add sortable functionality
                            makeTableSortable(tweetsTable);

                            contentDiv.appendChild(tweetsTable);
                        } else {
                            const noTweetsDiv = document.createElement('div');
                            noTweetsDiv.textContent = 'No tweets found for this user.';
                            contentDiv.appendChild(noTweetsDiv);
                        }

                        expandCell.appendChild(contentDiv);
                        expandRow.appendChild(expandCell);

                        // Insert the expandable row after the current row
                        row.parentNode.insertBefore(expandRow, row.nextSibling);
                    });
            } else {
                row.classList.remove('expanded');
            }
        });

        tableBody.appendChild(row);
    });

    // Make table sortable
    makeTableSortable(document.querySelector('#top-users-table'));
}
function makeTableSortable(table) {
    const headers = table.querySelectorAll('th');

    headers.forEach(header => {
        header.addEventListener('click', function () {
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const index = Array.from(headers).indexOf(header);
            const sortType = header.getAttribute('data-sort');
            const isAscending = header.classList.contains('asc');

            rows.sort((a, b) => {
                const cellA = a.children[index].innerText;
                const cellB = b.children[index].innerText;

                if (sortType === 'int') {
                    return isAscending ? cellA - cellB : cellB - cellA;
                } else {
                    return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
                }
            });

            // Remove existing rows
            while (tbody.firstChild) {
                tbody.removeChild(tbody.firstChild);
            }

            // Append sorted rows
            rows.forEach(row => {
                tbody.appendChild(row);
            });

            // Toggle sort direction
            headers.forEach(h => h.classList.remove('asc', 'desc'));
            header.classList.toggle('asc', !isAscending);
            header.classList.toggle('desc', isAscending);
        });
    });
}
function highlightText(text) {
    // Regular expressions to match hashtags and mentions
    const hashtagRegex = /#\w+/g;
    const mentionRegex = /@[\w+=]+/g;

    // Replace hashtags and mentions with highlighted versions
    return text
        .replace(hashtagRegex, match => `<span class="highlight">${match}</span>`)
        .replace(mentionRegex, match => `<span class="highlight">${match}</span>`);
}

function createTimeBarChart(data, containerId, labelKey, labelName) {
    let container = document.getElementById(containerId);
    container.className = 'bar-chart';

    // Sort data by month_year
    data.sort((a, b) => new Date(a[labelKey]) - new Date(b[labelKey]));

    // Find the maximum count to set bar heights
    let maxCount = Math.max(...data.map(d => d.count));

    // Set up SVG dimensions
    const margin = { top: 20, right: 20, bottom: 80, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select('#' + containerId)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Define gradient for each bar
    const defs = svg.append('defs');

    data.forEach((d, i) => {
        d.positive = d.sentiment_distribution.positive;
        d.neutral = d.sentiment_distribution.neutral;
        d.negative = d.sentiment_distribution.negative;


        const gradientId = `gradient-${i}`;
        const total = d.positive + d.neutral + d.negative;

        defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%')
            .selectAll('stop')
            .data([
                { offset: '0%', color: 'green', value: d.positive / total },
                { offset: `${(d.positive / total) * 100}%`, color: 'yellow', value: d.neutral / total },
                { offset: '100%', color: 'red', value: d.negative / total }
            ])
            .enter()
            .append('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);
    });


    // Create scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.month_year))
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([height, 0]);

    // Add axes
    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((d, i) => !(i % 2))))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .style('text-anchor', 'end');

    svg.append('g')
        .call(d3.axisLeft(yScale));

    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'time-bar')
        .attr('x', date => xScale(date.month_year)) // Reference the month_year here
        .attr('y', date => yScale(date.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.count))
        .attr('fill', 'rgb(18, 70, 64)')
        .on('click', function (event, d_idx) {
            //clear existing content
            const content = document.getElementById('tweet-details');
            content.innerHTML = '';

            // get data for this date by index (date)
            this_date_data = data[d_idx];

            // Remove existing highlight
            svg.selectAll('.time-bar').attr('fill', 'rgb(18, 70, 64)');

            // Highlight selected bar
            d3.select(this).attr('fill', '#ff7f0e');

            // Fetch and display tweets for this month_year
            const monthYear = encodeURIComponent(this_date_data.month_year); // Use the correct property from the data
            fetch('/api/tweets_by_month_year/' + monthYear)
                .then(response => response.json())
                .then(data => {    // Display Summary
                    let summaryDiv = document.createElement('div');
                    summaryDiv.className = 'summary';

                    let statsDiv = document.createElement('div');
                    statsDiv.className = 'stats';
                    statsDiv.innerHTML = `<strong>Summary Stats:</strong> Likes: ${data.total_likes}, Retweets: ${data.total_retweets}`;
                    summaryDiv.appendChild(statsDiv);

                    let searchQuery = `month_year:"${monthYear}"`;
                    // Add the button to perform the search on the same page 
                    let searchButton = document.createElement('button');
                    searchButton.className = 'btn btn-secondary float-right';
                    searchButton.textContent = 'View all matching tweets';

                    searchButton.addEventListener('click', function () {
                        // Set the search input value
                        document.getElementById('search-input').value = searchQuery;
                        // Perform the search
                        performSearch(searchQuery);
                        // Optionally, scroll to the search results section
                        document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
                    });

                    summaryDiv.appendChild(searchButton);

                    if (data.cooccurring_users.length > 0) {
                        let mentionsDiv = document.createElement('div');
                        mentionsDiv.className = 'cooccurring-users';
                        let mentionsTitle = document.createElement('strong');
                        mentionsTitle.textContent = 'Co-occurring Users Mentioned: ';
                        mentionsDiv.appendChild(mentionsTitle);
                        data.cooccurring_users.forEach(user => {
                            let userSpan = document.createElement('span');
                            userSpan.textContent = '@' + user;
                            mentionsDiv.appendChild(userSpan);
                        });
                        summaryDiv.appendChild(mentionsDiv);
                    }

                    if (data.cooccurring_hashtags.length > 0) {
                        let hashtagsDiv = document.createElement('div');
                        hashtagsDiv.className = 'cooccurring-hashtags';
                        let hashtagsTitle = document.createElement('strong');
                        hashtagsTitle.textContent = 'Co-occurring Hashtags: ';
                        hashtagsDiv.appendChild(hashtagsTitle);
                        data.cooccurring_hashtags.forEach(hashtag => {
                            let hashtagSpan = document.createElement('span');
                            hashtagSpan.textContent = '#' + hashtag;
                            hashtagsDiv.appendChild(hashtagSpan);
                        });
                        summaryDiv.appendChild(hashtagsDiv);
                    }

                    content.appendChild(summaryDiv);

                    const heatmapDiv = document.createElement('div');
                    heatmapDiv.className = 'heatmap';

                    // Create heatmap visualization
                    createHeatmap(heatmapDiv, data.hourly_counts);

                    content.appendChild(heatmapDiv);

                    // Display Tweets
                    if (data.tweets.length > 0) {
                        // Create table for tweets
                        let tweetsTable = document.createElement('table');
                        tweetsTable.className = 'tweets-table';

                        // Table header
                        let thead = document.createElement('thead');
                        thead.innerHTML = `
                            <tr>
                                <th data-sort="string">User</th>
                                <th data-sort="string">Language</th>
                                <th data-sort="int">Likes</th>
                                <th data-sort="int">Retweets</th>
                                <th>Tweet</th>
                            </tr>
                        `;
                        tweetsTable.appendChild(thead);

                        // Table body
                        let tbody = document.createElement('tbody');
                        data.tweets.slice(0, 10).forEach(tweet => {
                            let row = document.createElement('tr');

                            let trimmedUsername = tweet.user_screen_name.length > 20 ? tweet.user_screen_name.substring(0, 20) + '…' : tweet.user_screen_name;

                            row.innerHTML = `
                                <td>${trimmedUsername}</td>
                                <td>${tweet.tweet_language}</td>
                                <td>${tweet.like_count}</td>
                                <td>${tweet.retweet_count}</td>
                                <td class="tweet-text">${highlightText(tweet.tweet_text)}</td>
                            `;

                            // Color code tweet based on sentiment
                            let sentimentScore = tweet.sentiment_score || 0;
                            let tweetColor = sentimentToColor(sentimentScore);
                            row.style.backgroundColor = tweetColor;

                            tbody.appendChild(row);
                        });
                        tweetsTable.appendChild(tbody);

                        // Add sortable functionality to the table
                        makeTableSortable(tweetsTable);

                        content.appendChild(tweetsTable);
                    } else {
                        content.textContent = 'No tweets found.';
                    }

                })
                .catch(error => {
                    console.error('Error fetching tweets:', error);
                    const tweetDetailsDiv = document.getElementById('tweet-details');
                    tweetDetailsDiv.textContent = 'Error fetching tweets for this period.';
                });
        });
}

function createHeatmap(container, hourlyCounts) {
    // Create a container for the heatmap
    const heatmapContainer = document.createElement('div');
    heatmapContainer.className = 'heatmap-container';

    // Maximum count for normalization
    const maxCount = Math.max(...hourlyCounts);

    // Create a block for each hour
    for (let hour = 0; hour < 24; hour++) {
        const count = hourlyCounts[hour];
        const block = document.createElement('div');
        block.className = 'heatmap-block';

        // Set background color based on count
        const intensity = maxCount > 0 ? count / maxCount : 0;
        const color = `rgba(42, 157, 143, ${intensity})`;  // Blue color with varying opacity
        block.style.backgroundColor = color;

        // Tooltip showing the hour and count
        block.title = `${hour}:00 - ${hour}:59\n${count} tweets`;

        // Display the count on top of the block
        const countLabel = document.createElement('div');
        countLabel.className = 'heatmap-count';
        countLabel.textContent = count;
        block.appendChild(countLabel);

        // Display the hour at the bottom
        if (hour % 3 === 0) {
            const hourLabel = document.createElement('div');
            hourLabel.className = 'heatmap-hour';
            hourLabel.textContent = hour;
            block.appendChild(hourLabel);
        }
        // Append block to the container
        heatmapContainer.appendChild(block);
    }

    // Append the heatmap to the provided container
    container.appendChild(heatmapContainer);
}


function displaySummaryStatistics(stats) {
    const container = document.getElementById('stats-container');

    const statsList = [
        { label: 'Total Tweets', value: stats.total_tweets },
        { label: 'Total Likes', value: stats.total_likes },
        { label: 'Total Retweets', value: stats.total_retweets },
        { label: 'Unique Users', value: stats.total_users }
    ];

    statsList.forEach(stat => {
        const col = document.createElement('div');
        col.className = 'col-md-3';

        const statCard = document.createElement('div');
        statCard.className = 'stat-card';

        const statValue = document.createElement('h3');
        statValue.textContent = stat.value;

        const statLabel = document.createElement('p');
        statLabel.textContent = stat.label;

        statCard.appendChild(statValue);
        statCard.appendChild(statLabel);
        col.appendChild(statCard);
        container.appendChild(col);
    });
}
function createEggPath(scale) {
    return `
        M ${52.5 * scale} ${45 * scale} 
        C ${55 * scale} ${30 * scale}, ${65 * scale} ${30 * scale}, ${67.5 * scale} ${45 * scale} 
        M ${52.5 * scale} ${45 * scale} 
        C ${50 * scale} ${57.5 * scale}, ${70 * scale} ${57.5 * scale}, ${67.5 * scale} ${45 * scale}`;
}
// scaling function 11 to 1
function scaleDev(stratum) {
const numbers = stratum.map((d) => d.count)

const minScale = 1;
const maxScale = Math.max(...numbers);

if (maxScale === minScale) {
return numbers.map(() => 1);
}

return numbers.map(
(num) =>
    minScale + Math.sqrt((num - minScale) / (maxScale - minScale)) * (12 - 1)
);
}

function createLanguageBubbleChart(data) {
    const width = document.getElementById('language-bubble-chart').clientWidth / 1.5;
    const height = 500;
    const buffer = 75; 

    // make svg
    const svg = d3.select('#language-bubble-chart')
        .append('svg')
        .attr('width', width + buffer * 2)
        .attr('height', height + buffer * 2)
        .append('g')
        .attr('transform', `translate(${buffer}, ${buffer})`);


    // keep diagonal path, use scaling func
    const nodes = data.map((d, i) => {
        const t = i / (data.length - 1 || 1); 
        const x = t * width * 0.8; 
        const y = (t * height * 0.9) + (Math.sin(t * Math.PI) * height * -0.1); // Add curve to the diagonal path
        const r = scaleDev(data)[i]
        return { data: d, x, y, r };
    });

    console.log(nodes);

    // create egg
    const bubble = svg.selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x}, ${-d.r * 2})`);

    // draw eggs
    bubble.append('path')
        .attr('d', d => createEggPath(1)) 
        .attr('fill', 'rgb(18, 70, 64)')
        .attr('opacity', 0.8)
        .attr('stroke', '#333')
        .attr('stroke-width', 3); 

    // add labels
    bubble.append('text')
        .attr('x', d => d.r + 65)
        .attr('y', 0)
        .attr('text-anchor', 'start')
        .style('font-size', 12)
        .style('fill', 'white')
        .style('z-index', 10) 
        .text(d => `${d.data.language}: ${d.data.count}`);

    bubble.append('title')
        .text(d => `${d.data.language}: ${d.data.count} tweets`);

    // animate eggs
    bubble.transition()
        .duration(1000)
        .delay((d, i) => i * 200) 
        .attr('d', d => createEggPath(d.r))
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .ease(d3.easeBounceOut)
        .on('end', function (d) {
            // resizing
            d3.select(this).select('path')
                .transition()
                .duration(400)
                .attr('d', d => createEggPath(d.r))
                .attr('transform', d=> `translate(${-60*d.r}, ${-40*d.r})`); //manually fitted translation

            d3.select(this).select('text')
                .transition()
                .duration(500)
                .style('fill', 'black'); // Change text color to black
});
        
}

function createHistogram(data, containerId, xKey, yKey, xAxisLabel, yAxisLabel) {
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = document.getElementById(containerId).clientWidth / 1.5;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey])])
        .nice()
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end');

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d[xKey]))
        .attr('y', d => y(d[yKey]))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d[yKey]))
        .attr('fill', 'lightgrey');

    const ellipseGroup = svg.append('g');

    ellipseGroup.selectAll('.ellipse-stack')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'ellipse-stack')
        .attr('transform', d => `translate(${x(d[xKey]) + x.bandwidth() / 2}, 0)`)
        .each(function (d) {
            const barHeight = height - y(d[yKey]);
            const ellipseHeight = 10;
            const ellipsesCount = Math.floor(barHeight / ellipseHeight);
            const group = d3.select(this);

            for (let i = 0; i < ellipsesCount; i++) {
                group.append('path')
                    .attr('d', createEggPath(0.75))
                    .attr('transform', `translate(0, ${-10000})`)
                    .attr('fill', 'rgb(107, 57, 0)')
                    .attr('opacity', 0.8)
                    .transition()
                    .duration(500)
                    .delay(i * 100)
                    .attr('transform', `translate(${-45}, ${-35 + height - i * ellipseHeight - ellipseHeight / 2})`);
            }
        });

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 5)
        .text(xAxisLabel);

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .text(yAxisLabel);
}

function performSearch(query) {
    fetch('/api/search?query=' + encodeURIComponent(query))
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                displaySearchResults(data.tweets, query);
                document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });

            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function displaySearchResults(tweets, query) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = ''; // Clear previous results

    const heading = document.createElement('h3');
    heading.textContent = `Search Results for "${query}" (${tweets.length} tweets found)`;
    resultsContainer.appendChild(heading);

    if (tweets.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No tweets found matching your query.';
        resultsContainer.appendChild(noResults);
        return;
    }

    // Create a table to display tweets
    const table = document.createElement('table');
    table.className = 'table table-striped';

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>User</th>
            <th>Language</th>
            <th>Likes</th>
            <th>Retweets</th>
            <th>Tweet</th>
        </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    tweets.forEach(tweet => {
        const row = document.createElement('tr');

        // Trim username to 20 characters
        let trimmedUsername = tweet.user_screen_name.length > 20 ? tweet.user_screen_name.substring(0, 20) + '…' : tweet.user_screen_name;

        row.innerHTML = `
            <td>${trimmedUsername}</td>
            <td>${tweet.tweet_language}</td>
            <td>${tweet.like_count}</td>
            <td>${tweet.retweet_count}</td>
            <td class="tweet-text">${highlightText(tweet.tweet_text)}</td>
        `;

        // Color code tweet based on sentiment
        let sentimentScore = tweet.sentiment_score || 0;
        let tweetColor = sentimentToColor(sentimentScore);
        row.style.backgroundColor = tweetColor;

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    resultsContainer.appendChild(table);
}
