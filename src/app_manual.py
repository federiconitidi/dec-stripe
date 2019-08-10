# -*- coding: utf-8 -*-
"""
Created on Thu Jun 13 14:36:46 2019

@author: Nitidi Federico
"""

from common.database import Database
from models.gasbenchmark import GasBenchmark
from models.historicalgascons import HistoricalGasCons
from models.historicalgasprices import HistoricalGasPrices
import datetime
import uniswap
import requests
import time

Database.initialize()


