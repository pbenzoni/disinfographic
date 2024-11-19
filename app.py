from flask import Flask, render_template, jsonify
import pandas as pd
import ast
from collections import Counter
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
    
    # Compute counts and average sentiment
    ne_grouped = df_ne.groupby('named_entities_list').agg(
        count=('named_entities_list', 'size'),
        avg_sentiment=('sentiment_score', 'mean')
    ).reset_index()
    ne_grouped = ne_grouped.rename(columns={'named_entities_list': 'named_entity'})
    top_named_entities = ne_grouped.sort_values(by='count', ascending=False).head(10)
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
    top_hashtags = ht_grouped.sort_values(by='count', ascending=False).head(10)
    return top_hashtags.to_dict(orient='records')

def get_tweets_by_named_entity(ne):
    # Filter tweets containing the named entity
    df_ne = df.dropna(subset=['named_entities'])
    df_ne['named_entities_list'] = df_ne['named_entities'].apply(ast.literal_eval)
    filtered_tweets = df_ne[df_ne['named_entities_list'].apply(lambda ents: ne in ents)]
    # Include sentiment and hashtags
    tweets_list = filtered_tweets[['tweet_text', 'tweetid', 'sentiment', 'sentiment_score', 'hashtags']].to_dict(orient='records')
    # Get most common hashtags
    hashtags_series = filtered_tweets['hashtags'].dropna().apply(ast.literal_eval).explode()
    hashtag_counts = hashtags_series.value_counts().head(5)
    common_hashtags = hashtag_counts.index.tolist()
    return {
        'tweets': tweets_list,
        'common_hashtags': common_hashtags
    }

def get_tweets_by_hashtag(hashtag):
    # Filter tweets containing the hashtag
    df_ht = df.dropna(subset=['hashtags'])
    df_ht['hashtags_list'] = df_ht['hashtags'].apply(ast.literal_eval)
    filtered_tweets = df_ht[df_ht['hashtags_list'].apply(lambda tags: hashtag in tags)]
    # Include sentiment and named entities
    tweets_list = filtered_tweets[['tweet_text', 'tweetid', 'sentiment', 'sentiment_score', 'named_entities']].to_dict(orient='records')
    # Get most common named entities
    ne_series = filtered_tweets['named_entities'].dropna().apply(ast.literal_eval).explode()
    ne_counts = ne_series.value_counts().head(5)
    common_entities = ne_counts.index.tolist()
    return {
        'tweets': tweets_list,
        'common_entities': common_entities
    }


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

@app.route('/api/tweets_by_named_entity/<path:ne>')
def tweets_by_named_entity(ne):
    tweets_list = get_tweets_by_named_entity(ne.strip())
    return jsonify(tweets_list)

@app.route('/api/tweets_by_hashtag/<path:hashtag>')
def tweets_by_hashtag(hashtag):
    tweets_list = get_tweets_by_hashtag(hashtag.strip())
    return jsonify(tweets_list)

if __name__ == '__main__':
    app.run(debug=True)

if __name__ == '__main__':
    app.run(debug=True)