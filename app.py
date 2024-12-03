from flask import Flask, render_template, jsonify, request
import pandas as pd
import ast

import re
app = Flask(__name__)


# Load and preprocess data
df = pd.read_csv('data/processed_tweets.csv')

def parse_column(column):
    def parse_list(x):
        try:
            return ast.literal_eval(x)
        except:
            return []
    return column.apply(parse_list)
    

def get_hashtags():
    df_hashtags = parse_column(df['hashtags']).explode()
    hashtag_counts = df_hashtags.value_counts().reset_index()
    hashtag_counts.columns = ['hashtag', 'count']
    return hashtag_counts.to_dict(orient='records')

def get_summary_statistics():
    total_tweets = len(df)
    total_likes = df['like_count'].sum()
    total_retweets = df['retweet_count'].sum()
    total_users = df['user_screen_name'].nunique()
    return {
        'total_tweets': total_tweets,
        'total_likes': int(total_likes),
        'total_retweets': int(total_retweets),
        'total_users': total_users
    }

def get_language_distribution():
    lang_counts = df['tweet_language'].value_counts().reset_index()
    lang_counts.columns = ['language', 'count']
    #decode language codes
    lang_map = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'ar': 'Arabic',
        'pt': 'Portuguese',
        'in': 'Indonesian',
        'ca': 'Catalan',
        'tl': 'Filipino',
        'ht': 'Hausa',
        'und': 'Undefined'
    }
     #replace language codes with full names, fallback to code if not found
    lang_counts['language'] = lang_counts['language'].map(lang_map).fillna(lang_counts['language'])

    return lang_counts.to_dict(orient='records')

def get_influencers():
    influencers = df.groupby('user_screen_name').agg({
        'follower_count': 'max',
        'tweetid': 'count'
    }).reset_index()
    influencers.columns = ['user', 'followers', 'tweet_count']
    influencers = influencers.sort_values(by='followers', ascending=False)
    return influencers.to_dict(orient='records')

def get_timeline():
    df['tweet_time'] = pd.to_datetime(df['tweet_time'])
    timeline = df.groupby(df['tweet_time'].dt.date).size().reset_index(name='count')
    timeline.columns = ['date', 'count']
    return timeline.to_dict(orient='records')

# Data processing functions
def get_top_named_entities():
    # Extract named entities and sentiment scores
    df_ne = df[['named_entities', 'sentiment_score']].dropna(subset=['named_entities'])
    df_ne['named_entities_list'] = df_ne['named_entities'].apply(ast.literal_eval)
    df_ne = df_ne.explode('named_entities_list')
        # Compute counts and average sentiment, ignoring nan values
    
    ne_grouped = df_ne.groupby('named_entities_list').agg(
        count=('named_entities_list', 'size'),
        avg_sentiment=('sentiment_score', 'mean')
    ).reset_index()
    ne_grouped = ne_grouped.rename(columns={'named_entities_list': 'named_entity'})
    top_named_entities = ne_grouped.sort_values(by='count', ascending=False).head(25)
    return top_named_entities.to_dict(orient='records')

def get_top_hashtags():
    # Extract hashtags and sentiment scores
    df_ht = df[['hashtags', 'sentiment_score']].dropna(subset=['hashtags'])
    df_ht['hashtags_list'] = df_ht['hashtags'].apply(ast.literal_eval)
    df_ht = df_ht.explode('hashtags_list')
    
    # Compute counts and average sentiment
    ht_grouped = df_ht.groupby('hashtags_list').agg(
        count=('hashtags_list', 'size'),
        avg_sentiment=('sentiment_score', 'mean')
    ).reset_index()
    ht_grouped = ht_grouped.rename(columns={'hashtags_list': 'hashtag'})
    top_hashtags = ht_grouped.sort_values(by='count', ascending=False).head(15)
    return top_hashtags.to_dict(orient='records')

def get_top_mentions():
    # Extract mentions and sentiment scores
    df_mentions = df[['user_mentions', 'sentiment_score']].dropna(subset=['user_mentions'])
    df_mentions['mentions_list'] = df_mentions['user_mentions'].apply(ast.literal_eval)
    df_mentions = df_mentions.explode('mentions_list')
    
    # Compute counts and average sentiment
    mentions_grouped = df_mentions.groupby('mentions_list').agg(
        count=('mentions_list', 'size'),
        avg_sentiment=('sentiment_score', 'mean')
    ).reset_index()
    mentions_grouped = mentions_grouped.rename(columns={'mentions_list': 'mention'})
    top_mentions = mentions_grouped.sort_values(by='count', ascending=False).head(15)
    return top_mentions.to_dict(orient='records')

def get_tweet_counts_by_month():
   
    # Ensure 'created_at' is in datetime format
    df['tweet_time'] = pd.to_datetime(df['tweet_time'])

    
    # Create a 'month_year' column
    df['month_year'] = df['tweet_time'].dt.to_period('M')

    # compute sentiment distribution, grouped by positive, negative, neutral
    sentiment_counts = df['sentiment_score'].apply(lambda score: 'positive' if score > 0 else 'negative' if score < 0 else 'neutral').value_counts()
    sentiment_distribution = sentiment_counts.to_dict()

    # Group by 'month_year' and sentiment, count tweets
    df_month_sentiment = df.groupby(['month_year', 'sentiment']).agg(
        count=('tweetid', 'size')
    ).reset_index()

    
    # Group by 'month_year' and count tweets, include sentiment distribution
    df_month = df.groupby('month_year').agg(
        count=('tweetid', 'size')
    ).reset_index()

    # Include sentiment distribution as a nested dictionary
    df_month['sentiment_distribution'] = df_month['month_year'].apply(lambda month_year: sentiment_distribution)
    
    # Convert 'month_year' back to string for JSON serialization
    df_month['month_year'] = df_month['month_year'].astype(str)
    
    # Sort by 'month_year'
    df_month = df_month.sort_values('month_year')

    


    
    return df_month.to_dict(orient='records')

def get_tweets_by_month_year(month_year):
    # Ensure 'created_at' is in datetime format
    df['tweet_time'] = pd.to_datetime(df['tweet_time'])
    
    # Create a 'month_year' column
    df['month_year'] = df['tweet_time'].dt.to_period('M').astype(str)
    
    # Filter tweets for the given 'month_year'
    filtered_tweets = df[df['month_year'] == month_year]
    
    # sort by likes
    filtered_tweets = filtered_tweets.sort_values(by='like_count', ascending=False)
    
    # Include relevant tweet information
    tweets_list = filtered_tweets[['tweet_text', 'tweetid', 'user_screen_name', 'tweet_language', 'like_count', 'retweet_count', 'sentiment_score', 'hashtags', 'user_mentions']].to_dict(orient='records')
    
    # Aggregate stats
    total_likes = filtered_tweets['like_count'].sum()
    total_retweets = filtered_tweets['retweet_count'].sum()

    # Co-occurring users mentioned
    mentions_series = filtered_tweets['user_mentions'].dropna().apply(ast.literal_eval).explode()
    mentions_counts = mentions_series.value_counts().head(5)
    cooccurring_users = mentions_counts.index.tolist()

    #co-occurring hashtags
    hashtags_series = filtered_tweets['hashtags'].dropna().apply(ast.literal_eval).explode()
    hashtag_counts = hashtags_series.value_counts().head(15)
    cooccurring_hashtags = hashtag_counts.index.tolist()

    
    # Compute tweet counts per hour
    filtered_tweets['tweet_time'] = pd.to_datetime(filtered_tweets['tweet_time'])
    filtered_tweets['hour'] = filtered_tweets['tweet_time'].dt.hour
    hourly_counts_series = filtered_tweets.groupby('hour').size()
    hourly_counts = hourly_counts_series.reindex(range(24), fill_value=0).tolist()


    return {
        'tweets': tweets_list,
        'total_likes': int(total_likes),
        'total_retweets': int(total_retweets),
        'cooccurring_users': cooccurring_users,
        'cooccurring_hashtags': cooccurring_hashtags,
        'hourly_counts': hourly_counts  # New data added here
    }



def get_tweets_by_mention(mention):
    # Filter tweets containing the mention
    df_mention = df.dropna(subset=['user_mentions'])
    df_mention['mentions_list'] = df_mention['user_mentions'].apply(ast.literal_eval)
    filtered_tweets = df_mention[df_mention['mentions_list'].apply(lambda mentions: mention in mentions)]

    # sort by likes
    filtered_tweets = filtered_tweets.sort_values(by='like_count', ascending=False)

    # Include additional information
    tweets_list = filtered_tweets[['tweet_text', 'tweetid', 'user_screen_name', 'tweet_language', 'like_count', 'retweet_count', 'sentiment_score', 'hashtags', 'user_mentions']].to_dict(orient='records')

    # Aggregate stats
    total_likes = filtered_tweets['like_count'].sum()
    total_retweets = filtered_tweets['retweet_count'].sum()

    # Co-occurring users mentioned
    mentions_series = filtered_tweets['user_mentions'].dropna().apply(ast.literal_eval).explode()
    mentions_counts = mentions_series.value_counts().head(5)
    cooccurring_users = mentions_counts.index.tolist()

    #co-occurring hashtags
    hashtags_series = filtered_tweets['hashtags'].dropna().apply(ast.literal_eval).explode()
    hashtag_counts = hashtags_series.value_counts().head(5)
    cooccurring_hashtags = hashtag_counts.index.tolist()

    
    # Compute tweet counts per hour
    filtered_tweets['tweet_time'] = pd.to_datetime(filtered_tweets['tweet_time'])
    filtered_tweets['hour'] = filtered_tweets['tweet_time'].dt.hour
    hourly_counts_series = filtered_tweets.groupby('hour').size()
    hourly_counts = hourly_counts_series.reindex(range(24), fill_value=0).tolist()


    return {
        'tweets': tweets_list,
        'total_likes': int(total_likes),
        'total_retweets': int(total_retweets),
        'cooccurring_users': cooccurring_users,
        'cooccurring_hashtags': cooccurring_hashtags,
        'hourly_counts': hourly_counts  # New data added here
    }

# def get_tweets_by_named_entity(ne):
#     # Filter tweets containing the named entity
#     df_ne = df.dropna(subset=['named_entities'])
#     df_ne['named_entities_list'] = df_ne['named_entities'].apply(ast.literal_eval)
#     filtered_tweets = df_ne[df_ne['named_entities_list'].apply(lambda ents: ne in ents)]
#     # Include sentiment and hashtags
#     tweets_list = filtered_tweets[['tweet_text', 'tweetid', 'sentiment', 'sentiment_score', 'hashtags']].to_dict(orient='records')
#     # Get most common hashtags
#     hashtags_series = filtered_tweets['hashtags'].dropna().apply(ast.literal_eval).explode()
#     hashtag_counts = hashtags_series.value_counts().head(5)
#     common_hashtags = hashtag_counts.index.tolist()
#     return {
#         'tweets': tweets_list,
#         'common_hashtags': common_hashtags
#     }

def get_tweets_by_hashtag(hashtag):
    # Filter tweets containing the hashtag
    df_hashtag = df.dropna(subset=['hashtags'])
    df_hashtag['hashtags_list'] = df_hashtag['hashtags'].apply(ast.literal_eval)
    filtered_tweets = df_hashtag[df_hashtag['hashtags_list'].apply(lambda hashtags: hashtag in hashtags)]

    # sort df by likes
    filtered_tweets = filtered_tweets.sort_values(by='like_count', ascending=False)

    # Include additional information
    tweets_list = filtered_tweets[['tweet_text', 'tweetid', 'user_screen_name', 'tweet_language', 'like_count', 'retweet_count', 'sentiment_score', 'hashtags', 'user_mentions']].to_dict(orient='records')

    # Aggregate stats
    total_likes = filtered_tweets['like_count'].sum()
    total_retweets = filtered_tweets['retweet_count'].sum()

    # Co-occurring users mentioned
    mentions_series = filtered_tweets['user_mentions'].dropna().apply(ast.literal_eval).explode()
    mentions_counts = mentions_series.value_counts().head(5)
    cooccurring_users = mentions_counts.index.tolist()

    #co-occurring hashtags
    hashtags_series = filtered_tweets['hashtags'].dropna().apply(ast.literal_eval).explode()
    hashtag_counts = hashtags_series.value_counts().head(5)
    cooccurring_hashtags = hashtag_counts.index.tolist()

    # Compute tweet counts per hour
    filtered_tweets['tweet_time'] = pd.to_datetime(filtered_tweets['tweet_time'])
    filtered_tweets['hour'] = filtered_tweets['tweet_time'].dt.hour
    hourly_counts_series = filtered_tweets.groupby('hour').size()
    hourly_counts = hourly_counts_series.reindex(range(24), fill_value=0).tolist()

    return {
        'tweets': tweets_list,
        'total_likes': int(total_likes),
        'total_retweets': int(total_retweets),
        'cooccurring_users': cooccurring_users,
        'cooccurring_hashtags': cooccurring_hashtags,
        'hourly_counts': hourly_counts  # New data added here
    }


def get_top_users():
    # Existing code to get top users
    df_users = df.groupby('user_screen_name').agg({
        'tweetid': 'count',
        'like_count': 'sum',
        'retweet_count': 'sum',
        'follower_count': 'max'
    }).reset_index()
    df_users = df_users.rename(columns={
        'tweetid': 'tweet_volume',
        'user_screen_name': 'user'
    })
    # Get top 10 users by tweet volume
    top_users = df_users.sort_values(by='tweet_volume', ascending=False).head(10)
    return top_users.to_dict(orient='records')

def get_user_details(username):
    # Filter tweets by the user

    df_user = df[df['user_screen_name'] == username]

    # sort by likes
    df_user = df_user.sort_values(by='like_count', ascending=False)


    # Include additional information
    tweets_list = df_user[['tweet_text', 'tweetid', 'user_screen_name', 'tweet_language', 'like_count', 'retweet_count', 'sentiment_score', 'hashtags', 'user_mentions']].to_dict(orient='records')



    # Aggregate stats
    total_likes = df_user['like_count'].sum()
    total_retweets = df_user['retweet_count'].sum()

    # Co-occurring users mentioned
    mentions_series = df_user['user_mentions'].dropna().apply(ast.literal_eval).explode()
    mentions_counts = mentions_series.value_counts().head(5)
    cooccurring_users = mentions_counts.index.tolist()

    # Top hashtags used by the user
    hashtags_series = df_user['hashtags'].dropna().apply(ast.literal_eval).explode()
    hashtag_counts = hashtags_series.value_counts().head(5)
    top_hashtags = hashtag_counts.index.tolist()

    # Compute tweet counts per hour
    df_user['tweet_time'] = pd.to_datetime(df_user['tweet_time'])
    df_user['hour'] = df_user['tweet_time'].dt.hour
    hourly_counts_series = df_user.groupby('hour').size()
    hourly_counts = hourly_counts_series.reindex(range(24), fill_value=0).tolist()

    return {
        'tweets': tweets_list,
        'top_hashtags': top_hashtags,
        'total_likes': int(total_likes),
        'total_retweets': int(total_retweets),
        'cooccurring_users': cooccurring_users,
        'hourly_counts': hourly_counts  # New data added here
        
    }

# def get_retweet_network():
#     # Filter tweets containing the hashtag 'Syria'
#     df_filtered = df[df['hashtags'].str.contains('Syria', na=False, case=False)]
    
#     # Keep only retweets
#     df_retweets = df_filtered[df_filtered['is_retweet'] == True]
    
#     # Build edges: retweeter -> original tweeter
#     edges = df_retweets[['user_screen_name', 'retweet_userid']].dropna()
#     edges = edges.rename(columns={
#         'user_screen_name': 'source_user',
#         'retweet_userid': 'target_userid'
#     })
    
#     # Map retweet_userid back to user_screen_name
#     userid_to_screen_name = df[['userid', 'user_screen_name']].drop_duplicates()
#     userid_to_screen_name_dict = dict(zip(userid_to_screen_name['userid'], userid_to_screen_name['user_screen_name']))
#     edges['target_user'] = edges['target_userid'].map(userid_to_screen_name_dict)
    
#     # Remove edges with missing target_user
#     edges = edges.dropna(subset=['target_user'])
    
#     # Prepare nodes
#     nodes = pd.DataFrame({'id': pd.concat([edges['source_user'], edges['target_user']]).unique()})
    
#     # Prepare edges
#     edges = edges[['source_user', 'target_user']].rename(columns={
#         'source_user': 'source',
#         'target_user': 'target'
#     })
    
#     # Convert to dictionaries
#     nodes_list = nodes.to_dict(orient='records')
#     edges_list = edges.to_dict(orient='records')
    
#     return {'nodes': nodes_list, 'links': edges_list}

# Route for the home page
@app.route('/')
def index():
    return render_template('index.html')

# API endpoints for data
@app.route('/api/hashtags')
def hashtags_data():
    hashtags_list = get_hashtags()
    return jsonify(hashtags_list)

@app.route('/api/influencers')
def influencers_data():
    influencers_list = get_influencers()
    return jsonify(influencers_list)

@app.route('/api/timeline')
def timeline_data():
    timeline_list = get_timeline()
    return jsonify(timeline_list)

@app.route('/api/top_named_entities')
def top_named_entities():
    entities_list = get_top_named_entities()
    return jsonify(entities_list)

@app.route('/api/top_hashtags')
def top_hashtags():
    hashtags_list = get_top_hashtags()
    return jsonify(hashtags_list)

@app.route('/api/top_mentions')
def top_mentions():
    mentions_list = get_top_mentions()
    return jsonify(mentions_list)

@app.route('/api/tweets_by_mention/<path:mention>')
def tweets_by_mention_route(mention):
    data = get_tweets_by_mention(mention.strip())
    return jsonify(data)

# @app.route('/api/tweets_by_named_entity/<path:ne>')
# def tweets_by_named_entity(ne):
#     tweets_list = get_tweets_by_named_entity(ne.strip())
#     return jsonify(tweets_list)

@app.route('/api/tweets_by_hashtag/<path:hashtag>')
def tweets_by_hashtag(hashtag):
    tweets_list = get_tweets_by_hashtag(hashtag.strip())
    return jsonify(tweets_list)

@app.route('/api/tweet_counts_by_month')
def tweet_counts_by_month():
    counts_list = get_tweet_counts_by_month()
    return jsonify(counts_list)

@app.route('/api/tweets_by_month_year/<path:month_year>')
def tweets_by_month_year_route(month_year):
    data = get_tweets_by_month_year(month_year.strip())
    return jsonify(data)

@app.route('/api/top_users')
def top_users():
    users_list = get_top_users()
    return jsonify(users_list)

@app.route('/api/user_details/<path:username>')
def user_details(username):
    data = get_user_details(username.strip())
    return jsonify(data)

@app.route('/api/summary_statistics')
def summary_statistics():
    stats = get_summary_statistics()
    return jsonify(stats)

@app.route('/api/language_distribution')
def language_distribution():
    distribution = get_language_distribution()
    return jsonify(distribution)

@app.route('/api/word_count_histogram', methods=['GET'])
def word_count_histogram():
    word_counts = df['word_count'].value_counts().sort_index()
    histogram_data = word_counts.reset_index()
    histogram_data.columns = ['word_count', 'frequency']
    return jsonify(histogram_data.to_dict(orient='records'))

@app.route('/api/avg_word_length_histogram', methods=['GET'])
def avg_word_length_histogram():
    avg_word_lengths = df['avg_word_length'].round(0).value_counts().sort_index()
    histogram_data = avg_word_lengths.reset_index()
    histogram_data.columns = ['avg_word_length', 'frequency']
    return jsonify(histogram_data.to_dict(orient='records'))



@app.route('/api/search', methods=['GET'])
def search():
    search_df = df.copy()
    search_df['hashtags'] = search_df['hashtags'].dropna().apply(ast.literal_eval)
    search_df['user_mentions'] = search_df['user_mentions'].dropna().apply(ast.literal_eval)   
    query_string = request.args.get('query', '')
    if not query_string:
        return jsonify({'error': 'No query provided'}), 400

    # Parse the query and filter the DataFrame
    try:
        filtered_df = filter_dataframe(search_df, query_string)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Convert the filtered DataFrame to a list of dictionaries
    tweets_list = filtered_df.to_dict(orient='records')

    return jsonify({'tweets': tweets_list})

def filter_dataframe(df, query_string):
    # split query string into individual words
    queries = query_string.strip().split()
    # Start with the full DataFrame
    filtered_df = df

    for query in queries:
        # Regex pattern to match field-specific queries (e.g., field:value)
        pattern = r'(\w+):"([^"]+)"|\w+:\S+|\S+'

        if(':' in query):
            # Find all matches in the query string
            matches = re.findall(pattern, query)
        else:
            filtered_df = filtered_df[filtered_df['tweet_text'].str.contains(re.escape(query), case=False, na=False)]
            continue
        
        for match in matches:
            field, value = match[0], match[1]
            if field and value:
                # Field-specific search
                field = field.strip()
                value = value.strip()

                if field == 'hashtags':
                    # Filter where hashtags contain the value
                    filtered_df = filtered_df[filtered_df['hashtags'].apply(lambda x: value in x if isinstance(x, list) else False)]
                elif field == 'mentions':
                    # Filter where mentions contain the value
                    filtered_df = filtered_df[filtered_df['user_mentions'].apply(lambda x: value in x if isinstance(x, list) else False)]
                elif field == 'user':
                    # Filter where user_screen_name matches the value
                    filtered_df = filtered_df[filtered_df['user_screen_name'].str.contains(re.escape(value), case=False, na=False)]
                elif field == 'tweet_language':
                    # Filter where language matches the value
                    filtered_df = filtered_df[filtered_df['tweet_language'] == value]
                elif field == 'month_year':
                    # Filter where tweet_time matches the value (month_year - YYYY-MM) eg 2019-11-24 06:34:00 => 2019-11
                    filtered_df = filtered_df[filtered_df['tweet_time'].dt.to_period('M').astype(str) == value]
                else:
                    # Unknown field, raise an error
                    raise ValueError(f"Unknown field: {field}")
                

    return filtered_df[['tweetid', 'tweet_text', 'user_screen_name', 'tweet_language', 'like_count', 'retweet_count', 'sentiment_score', 'hashtags', 'user_mentions', 'tweet_time']]


if __name__ == '__main__':
    app.run(debug=True)
