import pandas as pd
import numpy as np
import os
import nltk
import re
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from gensim import corpora, models
from sklearn.feature_extraction.text import TfidfVectorizer
from textblob import TextBlob
import spacy

# Download NLTK data files (only need to run once)
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nlp = spacy.load('en_core_web_sm')

# Initialize the lemmatizer
lemmatizer = WordNetLemmatizer()

# Define stop words
stop_words = set(stopwords.words('english'))

# Define the file path
file_path = "C:\\Users\\benzo\\repo\\disinfographic\\data\\all_RNA_tweets.csv"

# Read the CSV file into a DataFrame
df = pd.read_csv(file_path, encoding='utf-8')

#filter out non-english tweets (tweets with language != 'en')
df = df[df['tweet_language'] == 'en']

# remove leading "rt " from tweets
df['tweet_text'] = df['tweet_text'].apply(lambda x: re.sub(r'^rt ', '', x))

# Display the first few rows
print(df.head())


def preprocess_tweet(text):
    text = str(text)
    # Lowercase the text
    text = text.lower()
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # Remove user @ references and '#' from hashtags
    text = re.sub(r'\@\w+|\#', '', text)
    # Remove punctuation and special characters
    text = re.sub(r'[^A-Za-z\s]', '', text)
    # Tokenize the text
    tokens = nltk.word_tokenize(text)
    # Remove stop words and lemmatize
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words]
    # Join the tokens back into a string
    cleaned_text = ' '.join(tokens)
    return cleaned_text

# Apply the preprocessing to the 'tweet_text' column
df['cleaned_text'] = df['tweet_text'].apply(preprocess_tweet)

# Display the cleaned tweets
print(df[['tweet_text', 'cleaned_text']].head())

# filter out tweets with less than 3 words
df = df[df['cleaned_text'].apply(lambda x: len(x.split()) > 2)]

# Prepare the data for topic modeling
texts = df['cleaned_text'].tolist()
tokenized_text = [text.split() for text in texts]

# Create a dictionary and corpus
dictionary = corpora.Dictionary(tokenized_text)
corpus = [dictionary.doc2bow(text) for text in tokenized_text]

# # Build the LDA model
# lda_model = models.LdaModel(corpus, num_topics=20, id2word=dictionary, passes=25)

# topic_labels = {
# 0	:	'Sudan Peace Agreement',
# 1	:	'Khartoum Airport',
# 2	:	'Sudan Student Protests',
# 3	:	'Personal Reflections',
# 4	:	'Turkish Role in Libya',
# 5	:	'Syrian Countryside Fires',
# 6	:	'COVID-19 Cases',
# 7	:	'Syria-Russia Relations',
# 8	:	'Attacks on Education Sector',
# 9	:	'Mozambique Conflict',
# 10	:	'General Commentary',
# 11	:	'CAR Sanctions',
# 12	:	'Zimbabwe Agriculture',
# 13	:	'Refugee Camp Conditions',
# 14	:	'Iraqi Military Operations',
# 15	:	'Aleppo Celebrations',
# 16	:	'SDF Militia News',
# 17	:	'Syrian Anti-Terrorism',
# 18	:	'Urban Car Bombings',
# 19	:	'Foreign Military Presence'
# }




# def get_top_topics_with_labels(lda_model, corpus, threshold=0.3):
#     all_top_topics = []
#     for doc_bow in corpus:
#         doc_topics = lda_model.get_document_topics(doc_bow)
#         filtered_topics = [(topic_id, prob) for topic_id, prob in doc_topics if prob >= threshold]
#         sorted_doc_topics = sorted(filtered_topics, key=lambda x: x[1], reverse=True)
#         top_three = [(topic_labels[topic_id], prob) for topic_id, prob in sorted_doc_topics[:3]]        
#         all_top_topics.append(top_three)
#     return all_top_topics

# df['top_topics'] = get_top_topics_with_labels(lda_model, corpus) 

# # print topics

# # Display the topics
# for idx, topic in lda_model.print_topics(-1):
#     print(f"Topic {idx+1}: {topic}\n")
#     #print a few sample tweets as well



def get_sentiment(text):
    analysis = TextBlob(text)
    # Polarity ranges from -1 (negative) to 1 (positive)
    return analysis.sentiment.polarity

# Apply sentiment analysis
df['sentiment_score'] = df['cleaned_text'].apply(get_sentiment)

# Categorize sentiment
def categorize_sentiment(score):
    if score > 0.3:
        return 'Positive'
    elif score < -0.3:
        return 'Negative'
    else:
        return 'Neutral'

df['sentiment'] = df['sentiment_score'].apply(categorize_sentiment)

# Display the sentiment results
print(df[['cleaned_text', 'sentiment_score', 'sentiment']].head())

# Download NLTK POS tagger data
nltk.download('averaged_perceptron_tagger')

def extract_pos_tags(text):
    tokens = nltk.word_tokenize(text)
    pos_tags = nltk.pos_tag(tokens)
    return pos_tags

# Apply POS tagging
df['pos_tags'] = df['cleaned_text'].apply(extract_pos_tags)

# Example of POS tags
print(df[['cleaned_text', 'pos_tags']].head())

def extract_named_entities(text):
    doc = nlp(text)
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    return entities

df['named_entities'] = df['cleaned_text'].apply(extract_named_entities)

# filter out named entities that are not a person, organization, or location
def filter_named_entities(entities):
    filtered_entities = [(text, label) for text, label in entities if label in ['PERSON', 'ORG', 'GPE', 'LOC', 'FAC', 'NORP']]
    return filtered_entities

df['named_entities'] = df['named_entities'].apply(filter_named_entities)

def word_count(text):
    tokens = text.split()
    return len(tokens)

def unique_word_count(text):
    tokens = text.split()
    return len(set(tokens))

def average_word_length(text):
    tokens = text.split()
    lengths = [len(word) for word in tokens]
    if lengths:
        return sum(lengths) / len(lengths)
    else:
        return 0

df['word_count'] = df['cleaned_text'].apply(word_count)
df['unique_word_count'] = df['cleaned_text'].apply(unique_word_count)
df['avg_word_length'] = df['cleaned_text'].apply(average_word_length)

# Display the linguistic features
print(df[['cleaned_text', 'word_count', 'unique_word_count', 'avg_word_length']].head())

# Define the output file path
output_file_path = r'C:\Users\benzo\repo\disinfographic\data\processed_tweets.csv'

# Save to CSV
df.to_csv(output_file_path, index=False)

print(f"Processed data saved to {output_file_path}")