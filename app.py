from flask import Flask, render_template, jsonify
import pandas as pd

app = Flask(__name__)

# Load and preprocess data
df = pd.read_csv('data/tweets.csv')

# Data processing functions
def get_hashtags():
    df_hashtags = df['hashtags'].dropna().apply(eval).explode()
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

if __name__ == '__main__':
    app.run(debug=True)