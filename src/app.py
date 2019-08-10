# -*- coding: utf-8 -*-
"""
Created on Thu Jun 13 14:36:46 2019

@author: Nitidi Federico
"""
#src.
#from common.database import Database
import datetime
import requests
from flask import Flask, render_template, request, session, json
from threading import Thread
from web3 import Web3
from random import shuffle
import random
import time

app=Flask(__name__)
app.secret_key='Federico'

##@app.before_first_request
##def initialize_database():
##    Database.initialize()

@app.route('/')
def index():
    return render_template('frontend.html')

@app.route('/store/<string:metadata>')
def bla(metadata):
    return render_template('frontend.html')

@app.route('/allstores/')
def allstores():
    return render_template('frontend.html')

if __name__=='__main__':
    app.run(port=4995)


