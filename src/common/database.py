# -*- coding: utf-8 -*-
"""
Created on Sat Jun 15 09:47:52 2017

@author: Nitidi Federico
"""
import pymongo
import os

class Database(object):
    #URI = "mongodb://127.0.0.1:27017"  #
    
    URI = "mongodb://heroku_8zpwvc6f:b5k3g8ako8hepru6noj7ntpmsi@ds261567.mlab.com:61567/heroku_8zpwvc6f"


    print(URI)
    DATABASE = None
    
    @staticmethod
    def initialize():
        client = pymongo.MongoClient(Database.URI)
        Database.DATABASE=client.get_default_database()  #['uniswap_roi']  #
    
    @staticmethod
    def insert(collection, data):
        Database.DATABASE[collection].insert(data)

    @staticmethod
    def find(collection, query):
        return Database.DATABASE[collection].find(query)

    @staticmethod
    def find_one(collection, query):
        return Database.DATABASE[collection].find_one(query)

    @staticmethod
    def remove(collection, query):
        return Database.DATABASE[collection].remove(query)
        
    @staticmethod
    def update(collection, query, data):
        Database.DATABASE[collection].update(query, data, upsert=True)
