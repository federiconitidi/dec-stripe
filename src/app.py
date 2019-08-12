# -*- coding: utf-8 -*-
"""
Created on Thu Jun 13 14:36:46 2019

@author: Nitidi Federico
"""
#src.
##from common.database import Database
##from models.transaction import Transaction
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

@app.route('/test/')
def test():
    return render_template('test.html')

@app.route('/store/<string:metadata>')
def bla(metadata):
    return render_template('frontend.html')

@app.route('/allstores/')
def allstores():
    return render_template('frontend.html')

##@app.route('/store_transaction/', methods=['GET'])
##def store_transaction():
##    tx_type = request.args['tx_type']
##    tx_hash = request.args['tx_hash']
##    account = request.args['account']
##    tx_status = 'just_sent'
##    created_date = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
##
##    transaction = Transaction(tx_type, tx_hash, tx_status, account, created_date)
##    transaction.save()
##    print("new transaction saved")
##    response = app.response_class(
##        response=json.dumps({}),
##        status=200,
##        mimetype='application/json')
##    return response



if __name__=='__main__':
    app.run(port=4995)


