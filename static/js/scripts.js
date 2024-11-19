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

                // Fetch and display data associated with this item
                let endpoint;
                if (labelKey === 'named_entity') {
                    endpoint = '/api/tweets_by_named_entity/';
                } else if (labelKey === 'hashtag') {
                    endpoint = '/api/tweets_by_hashtag/';
                } else if (labelKey === 'mention') {
                    endpoint = '/api/tweets_by_mention/';
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
                                    <td>${tweet.language}</td>
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
    let hue = ((sentimentScore + 1) / 2) * 120; // Map -1 to 1 to 0 to 120 degrees on the hue wheel
    return `hsl(${hue}, 70%, 80%)`; // Saturation 70%, Lightness 95% for a pale color
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
        row.addEventListener('click', function() {
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
                                    <td>${tweet.language}</td>
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
        header.addEventListener('click', function() {
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
    const mentionRegex = /@\w+/g;

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

    // Add bars
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'time-bar')
        .attr('x', d => xScale(d.month_year)) // Reference the month_year here
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.count))
        .attr('fill', '#69b3a2')
        .on('click', function (event, d) {
            // Remove existing highlight
            svg.selectAll('.time-bar').attr('fill', '#69b3a2');

            // Highlight selected bar
            d3.select(this).attr('fill', '#ff7f0e');

            // Fetch and display tweets for this month_year
            const monthYear = encodeURIComponent(d.month_year); // Use the correct property from the data
            fetch('/api/tweets_by_month_year/' + monthYear)
                .then(response => response.json())
                .then(data => {
                    const tweets = data.tweets.slice(0, 10);
                    const tweetDetailsDiv = document.getElementById('tweet-details');

                    // Clear previous content
                    tweetDetailsDiv.innerHTML = '';

                    if (tweets.length > 0) {
                        // Create table
                        const table = document.createElement('table');
                        table.className = 'table table-striped';

                        // Table header
                        const thead = document.createElement('thead');
                        const headerRow = document.createElement('tr');
                        const headers = ['Date', 'Tweet', 'Sentiment'];
                        headers.forEach(headerText => {
                            const th = document.createElement('th');
                            th.textContent = headerText;
                            headerRow.appendChild(th);
                        });
                        thead.appendChild(headerRow);
                        table.appendChild(thead);

                        // Table body
                        const tbody = document.createElement('tbody');
                        tweets.forEach(tweet => {
                            const row = document.createElement('tr');

                            // Date
                            const dateCell = document.createElement('td');
                            const tweetDate = new Date(tweet.created_at).toLocaleString();
                            dateCell.textContent = tweetDate;
                            row.appendChild(dateCell);

                            // Tweet Text
                            const tweetCell = document.createElement('td');
                            tweetCell.textContent = tweet.tweet_text;
                            row.appendChild(tweetCell);

                            // Sentiment
                            const sentimentCell = document.createElement('td');
                            const sentimentScore = tweet.sentiment_score || 0;
                            const sentimentColor = sentimentToColor(sentimentScore);
                            sentimentCell.style.backgroundColor = sentimentColor;
                            sentimentCell.textContent = sentimentScore.toFixed(2);
                            row.appendChild(sentimentCell);

                            tbody.appendChild(row);
                        });
                        table.appendChild(tbody);

                        // Append table to the details div
                        tweetDetailsDiv.appendChild(table);
                    } else {
                        tweetDetailsDiv.textContent = 'No tweets found for this period.';
                    }
                })
                .catch(error => {
                    console.error('Error fetching tweets:', error);
                    const tweetDetailsDiv = document.getElementById('tweet-details');
                    tweetDetailsDiv.textContent = 'Error fetching tweets for this period.';
                });
        });
}