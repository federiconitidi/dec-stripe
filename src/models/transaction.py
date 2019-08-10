# -*- coding: utf-8 -*-
"""
Created on Sat Jun 15 13:43:46 2017

@author: Nitidi Federico
"""
import datetime
import uuid
#src.
from src.common.database import Database


class Transaction(object):
    def __init__(self, tx_type, tx_hash, tx_status, account, created_date, _id=None):
        self.tx_type = tx_type
        self.tx_hash = tx_hash
        self.tx_status = tx_status
        self.account = account
        self.created_date = created_date
        self._id=uuid.uuid4().hex if _id is None else _id
        
    def save(self):
        Database.insert(collection="transactions",
                        data=self.json())

    def update(self):
        Database.update(collection="transactions",
                        query={'_id':self._id},
                        data=self.json())

    def delete(self):
        Database.remove(collection="transactions",
                        query={'_id':self._id})
    
    def json(self):
        return {
        'tx_type' : self.tx_type,
        'tx_hash' : self.tx_hash,
        'tx_status' : self.tx_status,
        'account' : account,
        'created_date': self.created_date,
        '_id':self._id
        }
        

