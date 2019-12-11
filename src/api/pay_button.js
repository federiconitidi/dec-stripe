//-----------------------------------------------------------------------------
// Payment button
//-----------------------------------------------------------------------------

buy_modal ='<div class="modal_onepay fade_onepay" id="pay_preview_modal" style="font-family: '+'"Museo Sans Cyrl"'+';font-weight: 100" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true"> <div class="modal-dialog_onepay modal-dialog-centered_onepay" role="document"> <!-- desktop version --> <div class="modal-content_onepay" style="padding:40px; text-align:center"> <div> <img id="pay_product_store_logo" style="height:70px; border-radius: 50%" src="" /><br><br> <span id="pay_product_store_name" style="font-size:20pt; font-family: '+'"Museo Sans Cyrl"'+';font-weight: 300;"></span><br> <br><br> <div class="row_onepay" style="padding:12px; border-radius: 5px;background:rgb(240, 240, 240); text-align:left"> <div class="col-5_onepay"> <span>Product:</span> </div> <div class="col-7_onepay"> <span id="pay_product_name"></span> <br><br> </div> <div class="col-5_onepay"> <span>Description:</span> </div> <div class="col-7_onepay"> <span id="pay_product_description"></span> <br><br> </div> <div class="col-5_onepay"> <span>Price:</span> </div> <div class="col-7_onepay"> <span id="pay_product_priceInEth"></span> <br> </div> </div> <br><br> <div style="text-align:center"> <button id="pay_product_pay_button" product_id="" contract_address="" priceInWei="" customer_id="" account_address="" type="button" class="btn_onepay green-button_onepay" data-dismiss="modal" onclick="payForButton(this)"></button><br><br> <span style="color:grey;cursor:pointer" data-dismiss="modal">Cancel</span> </div> </div> </div> </div> </div>'
pay_button_element = '<button type="button" class="btn_onepay green-button_onepay" product_id="{product_id}" contract_address="{contract_address}" customer_id="{customer_id}" onclick="connectWeb3andPay(this)">Buy now</button>'

//$('head').append('<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">');
//$('head').append('<link rel="stylesheet" href="/static/css/icalc.css"/>');
$('head').append('<link rel="stylesheet" href="/static/css/onepay_button_style.css"/>');

$.getScript("https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js")
$.getScript("/static/js/web3/web3.js")

// fetch the parameters sent long with the script request
document.currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
})();

CONTRACT_ADDRESS = document.currentScript.getAttribute('data_contract_address')
PRODUCT_ID = document.currentScript.getAttribute('data_product_id')
CUSTOMER_ID = document.currentScript.getAttribute('data_customer_id')

if (CONTRACT_ADDRESS==null || PRODUCT_ID == null || CUSTOMER_ID == null) {
CONTRACT_ADDRESS = window.onepay_data_contract_address
PRODUCT_ID = window.onepay_data_product_id
CUSTOMER_ID = window.onepay_data_customer_id

}





console.log(CONTRACT_ADDRESS)
console.log(PRODUCT_ID)
console.log(CUSTOMER_ID)

// configure the button element
pay_button_element = pay_button_element.replace(/{product_id}/g, PRODUCT_ID).replace(/{contract_address}/g, CONTRACT_ADDRESS).replace(/{customer_id}/g, CUSTOMER_ID)

// add the modal + the button for the payment to the page inside the div
document.getElementById("pay_button_form").innerHTML = buy_modal + pay_button_element




function payPreviewForButton(data){
    if (sessionStorage['payment_contract_products'] == 'nodata' || sessionStorage['store_name'] == 'nodata' || sessionStorage['store_logo'] == 'nodata') {
        setTimeout(payPreviewForButton, 100)
    } else{ 
        console.log("I have the products. Now I need to load the modal")
        product_id = PRODUCT_ID
        products = JSON.parse(sessionStorage['products'])
        product_to_display = {}
        for (i = 0, len = products.length; i < len; i++) {
            if(products[i]['_id']==parseInt(product_id)){
                product_to_display = products[i]
            }
        }
    
        // generate a random customer id
        customer_id = CUSTOMER_ID
        
        document.getElementById("pay_product_store_name").innerHTML = sessionStorage['store_name']
        $(pay_product_store_logo).attr("src" , sessionStorage['store_logo'])
                
        document.getElementById("pay_product_name").innerHTML = 'Buy ' + product_to_display['name']
        document.getElementById("pay_product_description").innerHTML = product_to_display['description']
        document.getElementById("pay_product_priceInEth").innerHTML = (product_to_display['priceInWei']/ Math.pow(10, 18)).toString() + ' ETH'
        document.getElementById("pay_product_pay_button").innerHTML = 'Pay ' + (product_to_display['priceInWei']/ Math.pow(10, 18)).toString() + ' ETH'
        $(pay_product_pay_button).attr("product_id" , PRODUCT_ID)
        $(pay_product_pay_button).attr("contract_address" , CONTRACT_ADDRESS)
        $(pay_product_pay_button).attr("priceInWei" , product_to_display['priceInWei'])
        $(pay_product_pay_button).attr("customer_id" , CUSTOMER_ID)
        $(pay_product_pay_button).attr("account_address" , sessionStorage['account_address'])
            
        $(pay_preview_modal).modal('show');
    }

}







// initiate connetcion with web3 browser
function connectWeb3andPay(user_input) {
    CONTRACT_ADDRESS = question_id = user_input.getAttribute("contract_address")
    PRODUCT_ID = question_id = user_input.getAttribute("product_id")
    CUSTOMER_ID = question_id = user_input.getAttribute("customer_id")

    if (typeof web3 !== 'undefined') {
        web3Provider = web3.currentProvider
        web3 = new Web3(web3.currentProvider)
    } else {
        window.alert("Please connect to Metamask or another web3 browser")
    }
    // Modern dapp browsers...
    if (window.ethereum) {
        web3 = new Web3(ethereum)

        // Request account access if needed
        console.log("Asking connection to web3 browser")
        ethereum.enable()
        checkWeb3ConnectionForButton()

    }
    // Legacy dapp browsers...
    else if (window.web3) {
        web3Provider = web3.currentProvider
        web3 = new Web3(web3.currentProvider)

    }
    // Non-dapp browsers...
    else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
}

// wait for the user to connect to a web3 browser
function checkWeb3ConnectionForButton() {
    var account = web3.eth.accounts[0];
    if (account == undefined) {
        setTimeout(checkWeb3ConnectionForButton, 100)
    } else {
        sessionStorage['account_address'] = account
        console.log("web3 access granted on " + account)
        sessionStorage['account_address'] = account
        queryPaymentContractProductsForButton(account, CONTRACT_ADDRESS)
        payPreviewForButton()
    }
}



function queryPaymentContractProductsForButton(account, contract_address) {
    sessionStorage['payment_contract_products'] = 'nodata'
    sessionStorage['store_logo']='nodata'
    sessionStorage['store_name']='nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

    // first query the blockchain for the store name
    PaymentContractInstance.store_name.call(function(err, store_name) {
        if (err) return console.log(err);
        sessionStorage['store_name'] = store_name
    });

    // first query the blockchain for the store logo
    PaymentContractInstance.store_logo.call(function(err, store_logo) {
        if (err) return console.log(err);
        sessionStorage['store_logo'] = store_logo
    });
        
    // first query the blockchain for the number of products in the contract
    PaymentContractInstance.productsCount.call(function(err, products_count) {
        if (err) return console.log(err);
        sessionStorage['products_count'] = products_count
        
        // then scan trhough the contract mapping and download the db of payment contracts created
        sessionStorage['products'] = JSON.stringify([])
        for (i = 0, len = products_count; i < len; i++) {
            PaymentContractInstance.products.call(i, function(err, data) {
                if (err) return console.log(err);
                console.log(data)
                product = {
                    '_id': data[0]['c'][0],
                    'name': data[1],
                    'description': data[2],
                    'priceInWei': data[3],
                    'isactive': data[4]
                }
              
                full_data = JSON.parse(sessionStorage['products'])
                full_data = $.merge(full_data, [product]);
                sessionStorage['products'] = JSON.stringify(full_data)
            });
        }
        waitForProductsDbReadyForButton()
    });
}



function waitForProductsDbReadyForButton() {
    products = JSON.parse(sessionStorage['products'])
    products_count = sessionStorage['products_count']
    if (products.length != products_count) {
        setTimeout("waitForProductsDbReadyForButton();", 100);
    } else {
        // this means all the responses have been received and the db of the products is ready
        console.log(products)
        sessionStorage['payment_contract_products'] = 'data_received'
    }
}



function payForButton(data){
    product_id = data.getAttribute("product_id")
    contract_address = data.getAttribute("contract_address")
    priceInWei = data.getAttribute("priceInWei")
    customer_id = data.getAttribute("customer_id")
    account = data.getAttribute("account_address")
    payForProduct(contract_address, product_id, priceInWei, customer_id, account)
}

function payForProduct(contract_address, product_id, priceInWei, customer_id, account) {
    web3.eth.defaultAccount = account;
   
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);
    PaymentContractInstance.pay(customer_id, parseInt(product_id), {from : account, value : priceInWei} , function(error, result) {
        if (!error){
            console.log('Succesfully approved payment to buy the product');
            console.log(result);
            full_data = JSON.parse(localStorage['pending_transactions'])
            full_data = $.merge(full_data, [{'type' : 'payForProduct', 'hash' : result, 'status' : 'pending', 'metadata' : sessionStorage['contract_address'], 'account' : sessionStorage['account_address']}]);
            localStorage['pending_transactions'] = JSON.stringify(full_data)
            //document.getElementById("pay_button_form").innerHTML = '<span style="color:green; font-size:30pt">&#10004; </span><span style="color:green; font-size:16pt">Purchase completed</span>'
            //call a function and pass them the parameters of the transaction in progress
            try {
              TransactionSentOnepay(result, CONTRACT_ADDRESS, PRODUCT_ID, CUSTOMER_ID)
            }
            catch(err) {}
            
            
            
        } else {
            console.log('error');
        }
    });
}

function TransactionSucceded(tx_hash){
    web3.eth.getTransaction(tx_hash, function(err, data){
        if (data['blockNumber'== null){
            return false
        } else {
            return true
        }
    });
}


PAYMENTCONTRACT_ABI=[
	{
		"constant": false,
		"inputs": [
			{
				"name": "_id",
				"type": "uint256"
			},
			{
				"name": "_name",
				"type": "string"
			},
			{
				"name": "_description",
				"type": "string"
			},
			{
				"name": "_price",
				"type": "uint256"
			}
		],
		"name": "editProduct",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "wallet",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_new_store_name",
				"type": "string"
			}
		],
		"name": "changeName",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_id",
				"type": "uint256"
			}
		],
		"name": "removeProduct",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "products",
		"outputs": [
			{
				"name": "_id",
				"type": "uint256"
			},
			{
				"name": "name",
				"type": "string"
			},
			{
				"name": "description",
				"type": "string"
			},
			{
				"name": "priceInWei",
				"type": "uint256"
			},
			{
				"name": "isactive",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "payments",
		"outputs": [
			{
				"name": "_id",
				"type": "uint256"
			},
			{
				"name": "customer_id",
				"type": "string"
			},
			{
				"name": "product_id",
				"type": "uint256"
			},
			{
				"name": "product_name",
				"type": "string"
			},
			{
				"name": "price_paid",
				"type": "uint256"
			},
			{
				"name": "sender",
				"type": "address"
			},
			{
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_customer_id",
				"type": "string"
			},
			{
				"name": "_product_id",
				"type": "uint256"
			}
		],
		"name": "pay",
		"outputs": [],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_new_wallet",
				"type": "address"
			}
		],
		"name": "changeWallet",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_name",
				"type": "string"
			},
			{
				"name": "_description",
				"type": "string"
			},
			{
				"name": "_price",
				"type": "uint256"
			}
		],
		"name": "createProduct",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "paymentsCount",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "fees_wallet",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "store_logo",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "fee_numerator",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "fee_denominator",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "productsCount",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "store_name",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"name": "_owner",
				"type": "address"
			},
			{
				"name": "_store_name",
				"type": "string"
			},
			{
				"name": "_store_logo",
				"type": "string"
			},
			{
				"name": "_fees_wallet",
				"type": "address"
			},
			{
				"name": "_fee_numerator",
				"type": "uint256"
			},
			{
				"name": "_fee_denominator",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	}
]