//-----------------------------------------------------------------------------
// Setup
//-----------------------------------------------------------------------------


$(document).ready(function () {
    console.log( "ready!" );
    create_fingerprint();
    if (localStorage['pending_transactions'] == undefined){
        localStorage['pending_transactions'] = JSON.stringify([])
    }
   
    if (window.location.href.indexOf("/store/") >= 0){
        // extract the parameters: address and (if present) pool
        metadata = window.location.href.slice(window.location.href.indexOf("/store/")+7 , window.location.href.lenght)
        contract_address = metadata
        console.log('enetered direct store')
        console.log(metadata)
        // go to the store page
        sessionStorage['contract_address'] = contract_address
        sessionStorage['navigation_history']=',/#,/allstores'
        connectWeb3()
        changePage('/store')
    } else if (window.location.href.indexOf("/allstores") >= 0) {
    connectWeb3()
            sessionStorage['navigation_history']=',/#'
            changePage('/allstores')
        
    } else {
    
        sessionStorage['navigation_history']=''
        changePage('/#')
    }
    refreshPendingTransactions()
});



function changePage(extension) {
        sessionStorage['existing_stores']=''
        document.getElementById("content_card").innerHTML = ''
        var parent = document.getElementById("content_card")
        
        // save current path - basically where I'm now
        pages_list = sessionStorage['navigation_history'].split(',')
        current_page = pages_list[pages_list.length-1]
        console.log(current_page)
        // only in the case of the waiting page, don't put that in the cronology
        if(current_page != extension){
                sessionStorage['navigation_history'] = sessionStorage['navigation_history'] + ',' + extension
        }
        console.log(sessionStorage['navigation_history'])
        // understand which page to load based on the extension
        // first, separate the parameters, which we conventionally separate with "#"
        // the first element of the list will be the page (e.g. /pool/mamma), and the following elements, if present, are the parameters
        routing_list = extension.split("&")
        
        // check if there are parameters or not
        if (routing_list.length==1) {
            // in this case, there are no parameters, just the page 
            new_page = routing_list[0]
            parameters = []
        } else {
            // in this case, there are both the page and some parameters
            new_page = routing_list[0]
            parameters = []
        }
    
        // now that we know which page we need to go next, load this page
        // first, let's adapt the url in the browser bar
        console.log(new_page)
        // then, load the right page
        if (new_page=='/store'){
            window.history.pushState(null, null, extension + '/' + sessionStorage['contract_address']);
            sessionStorage['window_timestamp'] = window.location.href
            getManageStorePage()
        }  else if (new_page=='/allstores') {
            window.history.pushState(null, null, extension);
            account = sessionStorage['account_address']
            findStoresInBlockchain(account)
        }  else if (new_page=='/#') {
            window.history.pushState(null, null, extension);
            getStartedPage()
        }
        return false;
}



// handles the popstate events, i.e. when a user click on the "back" button on the browser
$(window).on("popstate", function(e) {
        pageBack()
});

function pageBack() {
        previous_pages_list = sessionStorage['navigation_history'].split(',')
        //console.log(previous_pages_list)
        previous_page = previous_pages_list[previous_pages_list.length-2]
        //console.log(previous_page)
        if (previous_pages_list.slice(0,-2).length == 0) {
            window.history.back()
        } else {
            sessionStorage['navigation_history'] = previous_pages_list.slice(0,-2).join(',')
            changePage(previous_page)
        }
}

function getStartedPage() {
    document.getElementById("content_card").innerHTML = document.getElementById("before_connecting_element").innerHTML
    document.getElementById("go_back_button").innerHTML = ''
}



// initiate connetcion with web3 browser
function connectWeb3() {
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
        checkWeb3Connection()

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
function checkWeb3Connection() {
    var account = web3.eth.accounts[0];
    if (account == undefined) {
        setTimeout(checkWeb3Connection, 100)
        

    } else {
        sessionStorage['account_address'] = account
        console.log("web3 access granted on " + account)
        document.getElementById("account_address").innerHTML = account.substring(0, 15) + "..."
        pages_list = sessionStorage['navigation_history'].split(',')
        current_page = pages_list[pages_list.length-1]
        if(current_page=='/#' || current_page=='/') {
            changePage('/allstores')
        } else {
            // dont change the page
        }
    }
}


// download from the blockchain the records of all the stores that have been created
// at the end, call the function waitForDbReady() to wait for all the responses to arrive from the blockchain and to be stored in the db
function findStoresInBlockchain(account) {
    web3.eth.defaultAccount = account;
    var FactoryContract = web3.eth.contract(FACTORY_ABI);
    var Factory = FactoryContract.at(FACTORY_CONTRACT);

    // first, find the counter of payment contracts (stores) created
    Factory.contractsCount.call(function(err, data) {
        if (err) return console.log(err);
        contracts_count = data['c'][0]
        sessionStorage['contracts_count'] = contracts_count
        console.log(contracts_count);

        // then scan trhough the contract mapping and download the db of payment contracts created
        sessionStorage['contracts'] = JSON.stringify([])
        for (i = 0, len = contracts_count; i < len; i++) {
            Factory.contracts.call(i, function(err, data) {
                if (err) return console.log(err);
                contract = {
                    'owner': data[1],
                    'contract_address': data[2],
                    'store_name' : data[3],
                    'store_logo' : data[4],
                    'fees_wallet' : data[5],
                    'fee_numerator' : data[6],
                    'fee_denominator' : data[7]
                }
              
                full_data = JSON.parse(sessionStorage['contracts'])
                full_data = $.merge(full_data, [contract]);
                sessionStorage['contracts'] = JSON.stringify(full_data)
            });
        }
        // once the for loop has iterated over all the store contracts, wait for all the responses to arrive
        waitForDbReady()
    });
}


// wait for all the contract records to arrive so that the db of the stores is complete
// once the db is completed, visualize the existing checkouts
function waitForDbReady() {
    account = sessionStorage['account_address']
    contracts = JSON.parse(sessionStorage['contracts'])
    contracts_count = sessionStorage['contracts_count']
    if (contracts.length != contracts_count) {
        setTimeout("waitForDbReady();", 100);
    } else {
        // this means all the responses have been received and the db of the stores is ready
        console.log(contracts)
        contracts_of_this_account = []
        // isolate the stores that are owned by the current user (account)
        for (i = 0, len = contracts.length; i < len; i++) {
            if (contracts[i]['owner'] == account) {
                contracts_of_this_account = $.merge(contracts_of_this_account, [contracts[i]])
            }
        }
        contracts_of_this_account.sort(function(first, second) {return second.contract_address - first.contract_address})
        
        // check if there are transactions in progress for creating a new payment contract
        pending_contracts_of_this_account = []
        full_data = JSON.parse(localStorage['pending_transactions'])
        for (i = 0, len = full_data.length; i < len; i++) {
            if (full_data[i]['type'] == 'createPaymentContract' && full_data[i]['account'] == sessionStorage['account_address']) {
                pending_contracts_of_this_account = $.merge(pending_contracts_of_this_account, [full_data[i]])
            }
        }
        pending_contracts_of_this_account.sort(function(first, second) {return second.hash - first.hash})
        
        pages_list = sessionStorage['navigation_history'].split(',')
        current_page = pages_list[pages_list.length-1]
        console.log('updating allstores page vs blockchain')
        if (current_page == '/allstores'){
            if (contracts_of_this_account.length > 0 || pending_contracts_of_this_account.length > 0) {
                
                rows = ''
                for (i = 0, len = contracts_of_this_account.length; i < len; i++) {
                    rows = rows + document.getElementById("existing_store_row").innerHTML.replace(/{contract_address}/g, contracts_of_this_account[i]['contract_address']).replace(/{contract_address_display}/g, contracts_of_this_account[i]['contract_address'].substring(0, 15) + "...").replace(/{store_name}/g, contracts_of_this_account[i]['store_name']).replace(/{store_logo}/g, contracts_of_this_account[i]['store_logo'])
                }
                for (i = 0, len = pending_contracts_of_this_account.length; i < len; i++) {
                    rows = rows + document.getElementById("pending_store_row").innerHTML.replace(/{hash_shortened}/g, pending_contracts_of_this_account[i]['hash'].substring(0, 10) + "...").replace(/{hash}/g, pending_contracts_of_this_account[i]['hash'])
                }
                
                if (rows!=sessionStorage['existing_stores']){
                    // if the user owns some existing stores, display them
                    document.getElementById("content_card").innerHTML = document.getElementById("existing_checkouts_element").innerHTML
                    document.getElementById("go_back_button").innerHTML = '<span class="button-label" onclick="pageBack();">&larr; BACK</span>'
                    document.getElementById("existing_stores_desk").innerHTML = rows
                    document.getElementById("existing_stores_mobi").innerHTML = rows
                }
                sessionStorage['existing_stores'] = rows
                setTimeout("findStoresInBlockchain();", 2000);
                
            } else {
                // if the user doesn't own any store, go to the checkout creation page
                if (document.getElementById("create_new_checkout_element").innerHTML != sessionStorage['existing_stores']){
                    document.getElementById("content_card").innerHTML = document.getElementById("create_new_checkout_element").innerHTML
                    document.getElementById("go_back_button").innerHTML = '<span class="button-label" onclick="pageBack();">&larr; BACK</span>'
                }
                sessionStorage['existing_stores'] = document.getElementById("create_new_checkout_element").innerHTML
                setTimeout("findStoresInBlockchain();", 2000);
            }
        }
    }
}



function refreshPendingTransactions() {
    // check if there are transactions in progress
    full_data = JSON.parse(localStorage['pending_transactions'])
    for (i = 0, len = full_data.length; i < len; i++) {
        web3.eth.getTransactionReceipt(full_data[i]['hash'], function(e, data) {
                    if (e !== null) {
                        console.log("Could not find a transaction for your id!");
                        // still include the transaction, do nothing
                    } else if (data == null){
                        // still include the transaction, do nothing
                    } else {
                        if (data.status == '0x0') {
                            console.log("The contract execution was not successful, check your transaction !");
                            // pop the transaction from the list
                            current_pending = JSON.parse(localStorage['pending_transactions'])
                            for (i = 0, len = current_pending.length; i < len; i++) {
                                if (current_pending[i]['hash'] == data['transactionHash']) {
                                    current_pending = current_pending.splice(i, 1);
                                }
                            }
                            localStorage['pending_transactions'] = JSON.stringify(current_pending)

                        } else {
                            console.log("Execution worked fine!");
                            // pop the transaction from the list
                            current_pending = JSON.parse(localStorage['pending_transactions'])
                            for (i = 0, len = current_pending.length; i < len; i++) {
                                if (current_pending[i]['hash'] == data['transactionHash']) {
                                    current_pending.splice(i, 1);
                                }
                                
                            }
                            localStorage['pending_transactions'] = JSON.stringify(current_pending)
                            console.log(current_pending)
                        }
                    }
                    
        })
    }
    setTimeout("refreshPendingTransactions();", 1000);
}

function queryPaymentContractOwner(account, contract_address) {
    sessionStorage['payment_contract_owner'] = 'nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

    // query the blockchain for the owner of the contract
    PaymentContractInstance.owner.call(function(err, data) {
        if (err) return console.log(err);
        sessionStorage['payment_contract_owner'] = data
    });
}

function queryPaymentContractName(account, contract_address) {
    sessionStorage['payment_contract_name'] = 'nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

    // query the blockchain for the owner of the contract
    PaymentContractInstance.store_name.call(function(err, data) {
        if (err) return console.log(err);
        sessionStorage['payment_contract_name'] = data
    });
}

function queryPaymentContractLogo(account, contract_address) {
    sessionStorage['payment_contract_logo'] = 'nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

    // query the blockchain for the owner of the contract
    PaymentContractInstance.store_logo.call(function(err, data) {
        if (err) return console.log(err);
        sessionStorage['payment_contract_logo'] = data
    });
}

function queryPaymentContractWallet(account, contract_address) {
    sessionStorage['payment_contract_wallet'] = 'nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

    // query the blockchain for the payable wallet of the contract
    PaymentContractInstance.wallet.call(function(err, data) {
        if (err) return console.log(err);
        sessionStorage['payment_contract_wallet'] = data
    });
}

function queryPaymentContractProducts(account, contract_address) {
    sessionStorage['payment_contract_products'] = 'nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

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
        waitForProductsDbReady()
    });
}


function queryPaymentContractPayments(account, contract_address) {
    sessionStorage['payment_contract_payments'] = 'nodata'
    web3.eth.defaultAccount = account;
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);

    // first query the blockchain for the number of products in the contract
    PaymentContractInstance.paymentsCount.call(function(err, payments_count) {
        if (err) return console.log(err);
        sessionStorage['payments_count'] = payments_count
        
        // then scan trhough the contract mapping and download the db of payment contracts created
        sessionStorage['payments'] = JSON.stringify([])
        for (i = 0, len = payments_count; i < len; i++) {
            PaymentContractInstance.payments.call(i, function(err, data) {
                if (err) return console.log(err);
                console.log(data)
                payment = {
                    '_id': data[0]['c'][0],
                    'customer_id': data[1],
                    'product_id': data[2],
                    'product_name': data[3],
                    'price_paid': data[4],
                    'sender': data[5],
                    'timestamp': data[6]
                }
              
                full_data = JSON.parse(sessionStorage['payments'])
                full_data = $.merge(full_data, [payment]);
                sessionStorage['payments'] = JSON.stringify(full_data)
            });
        }
        waitForPaymentsDbReady()
    });
}

function waitForPaymentsDbReady() {
    payments = JSON.parse(sessionStorage['payments'])
    payments_count = sessionStorage['payments_count']
    if (payments.length != payments_count) {
        setTimeout("waitForPaymentsDbReady();", 100);
    } else {
        // this means all the responses have been received and the db of the payments is ready
        console.log(payments)
        sessionStorage['payment_contract_payments'] = 'data_received'
    }
}

function waitForProductsDbReady() {
    products = JSON.parse(sessionStorage['products'])
    products_count = sessionStorage['products_count']
    if (products.length != products_count) {
        setTimeout("waitForProductsDbReady();", 100);
    } else {
        // this means all the responses have been received and the db of the products is ready
        console.log(products)
        sessionStorage['payment_contract_products'] = 'data_received'
    }
}

function manageStore(data){
    contract_address = data.getAttribute("contract_address")
    sessionStorage['contract_address'] = contract_address
    changePage('/store')
}

function getManageStorePage() {
    contract_address = sessionStorage['contract_address']
    account = sessionStorage['account']
    queryPaymentContractName(account, contract_address)
    queryPaymentContractLogo(account, contract_address)
    queryPaymentContractOwner(account, contract_address)
    queryPaymentContractWallet(account, contract_address)
    queryPaymentContractProducts(account, contract_address)
    queryPaymentContractPayments(account, contract_address)
    waitForPaymentContractDataLoaded()
}



function waitForPaymentContractDataLoaded() {
    contract_address = sessionStorage['contract_address']
    if (sessionStorage['payment_contract_owner'] == 'nodata' || sessionStorage['payment_contract_wallet'] == 'nodata' || sessionStorage['payment_contract_products'] == 'nodata' || sessionStorage['payment_contract_payments'] == 'nodata' || sessionStorage['payment_contract_name'] == 'nodata' || sessionStorage['payment_contract_logo'] == 'nodata') {
        setTimeout("waitForPaymentContractDataLoaded();", 100);
    } else {
        contract_address = sessionStorage['contract_address']
        store_name = sessionStorage['payment_contract_name']
        store_logo = sessionStorage['payment_contract_logo']
        owner = sessionStorage['payment_contract_owner']
        wallet = sessionStorage['payment_contract_wallet']
        products = JSON.parse(sessionStorage['products'])
        products.sort(function(first, second) {return second._id - first._id})
        
        products_rows=''
        for (i = 0, len = products.length; i < len; i++) {
            if(products[i]['isactive']==true){
                row = document.getElementById("product_row").innerHTML.replace(/{name}/g, products[i]['name']).replace(/{description}/g, products[i]['description']).replace(/{price}/g, products[i]['priceInWei'] / Math.pow(10, 18)).replace(/{isactive}/g, products[i]['isactive']).replace(/{_id}/g, products[i]['_id']).replace(/{contract_address}/g, contract_address)

                // check if there are transactions in progress for deleting product
                pending_contracts_of_this_product = []
                full_data = JSON.parse(localStorage['pending_transactions'])
                for (j = 0, len1 = full_data.length; j < len1; j++) {
                    if (full_data[j]['type'] == 'deleteProduct' && full_data[j]['account'] == sessionStorage['account_address'] && full_data[j]['metadata'] == sessionStorage['contract_address'] + products[i]['_id']) {
                        pending_contracts_of_this_product = $.merge(pending_contracts_of_this_product, [full_data[j]])
                    }
                }
                // if there is transaction to create a new product, show the loading gif next to the new product button
                if (pending_contracts_of_this_product.length > 0) {
                    row = row.replace(/{loading_delete_product}/g, '<img  style="height:20px" src="/static/img/loading.gif"/>').replace(/{delete_function}/g, '')
                } else {
                    row = row.replace(/{loading_delete_product}/g, '').replace(/{delete_function}/g, 'deleteProduct(this)')
                }
                
                products_rows = products_rows + row     
  
            }
        }
        console.log(sessionStorage['products'])
        
        // now lets display the payments processed
        payments = JSON.parse(sessionStorage['payments'])
        payments.sort(function(first, second) {return second._id - first._id})
        
        payments_rows=''
        for (i = 0, len = payments.length; i < len; i++) {
                payments_rows = payments_rows + document.getElementById("payment_row").innerHTML.replace(/{customer_id}/g, payments[i]['customer_id']).replace(/{product_id}/g, payments[i]['product_id']).replace(/{product_name}/g, payments[i]['product_name']).replace(/{price_paid}/g, (payments[i]['price_paid']/ Math.pow(10, 18)).toString()+' ETH').replace(/{timestamp}/g, payments[i]['timestamp']).replace(/{sender}/g, payments[i]['sender'])
 
        }
        console.log(sessionStorage['payments'])
        

        var content = document.getElementById("manage_store_panel_element").innerHTML.replace(/{contract_address}/g, contract_address).replace(/{owner}/g, owner).replace(/{wallet}/g, wallet).replace(/{products_rows}/g, products_rows).replace(/{payments_rows}/g, payments_rows)

        // check if there are transactions in progress for creating a new product
        pending_contracts_of_this_account = []
        full_data = JSON.parse(localStorage['pending_transactions'])
        for (i = 0, len = full_data.length; i < len; i++) {
            if (full_data[i]['type'] == 'createProduct' && full_data[i]['account'] == sessionStorage['account_address'] && full_data[i]['metadata'] == sessionStorage['contract_address']) {
                pending_contracts_of_this_account = $.merge(pending_contracts_of_this_account, [full_data[i]])
            }
        }
        // if there is transaction to create a new product, show the loading gif next to the new product button
        if (pending_contracts_of_this_account.length > 0) {
            content = content.replace(/{loading}/g, '<img  style="height:20px" src="/static/img/loading.gif"/>')
        } else {
            content = content.replace(/{loading}/g, '')
        }
       

        pages_list = sessionStorage['navigation_history'].split(',')
        current_page = pages_list[pages_list.length-1]
        console.log('updating store page vs blockchain')
        if (current_page=='/store'){
            document.getElementById("content_card").innerHTML = content
            sessionStorage['window_timestamp'] = window.location.href
            setTimeout("getManageStorePage();", 2000);
        }
    }
}



// function to create a new payment contract (i.e. a new store)
function createPaymentContract() {
    $(create_store_modal).modal('hide');
    store_name = sessionStorage['new_store_name']
    // recreate a random avatar
    themes = ['frogideas', 'sugarsweets', 'heatwave', 'daisygarden', 'seascape', 'summerwarmth', 'bythepool', 'duskfalling', 'berrypie', 'base']
    number_of_colors= [2,3,4]
    shapes = ['squares' , 'isogrids', 'spaceinvaders', 'labs/isogrids/hexa', 'labs/isogrids/hexa16']

    theme = themes[Math.floor(Math.random() * 9)]
    colors = (number_of_colors[Math.floor(Math.random() * 2)]).toString()
    shape = shapes[Math.floor(Math.random() * 4)]
    store_logo = "http://tinygraphs.com/"+shape+"/tinygraphs?theme="+theme+"&numcolors="+colors+"&size=220&fmt=svg"
    
    
    account = sessionStorage['account_address']
    web3.eth.defaultAccount = account;
    var FactoryContract = web3.eth.contract(FACTORY_ABI);
    var Factory = FactoryContract.at(FACTORY_CONTRACT);
    Factory.newPaymentContract(account, store_name, store_logo, function(error, result) {
        if (!error){
            console.log('Succesfully approved transaction to create a new payment contract');
            console.log(result);
            full_data = JSON.parse(localStorage['pending_transactions'])
            full_data = $.merge(full_data, [{'type' : 'createPaymentContract', 'hash' : result, 'status' : 'pending', 'metadata' : '', 'account' : sessionStorage['account_address']}]);
            localStorage['pending_transactions'] = JSON.stringify(full_data)
        } else {
            console.log('error');
        }
    });

}


// function to delete a product from the store
function deleteProduct(data) {
    account = sessionStorage['account_address']
    web3.eth.defaultAccount = account;
    product_id = data.getAttribute("product_id")
    sessionStorage['product_id'] = product_id
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);
    PaymentContractInstance.removeProduct(parseInt(product_id), function(error, result) {
        if (!error){
            console.log('Succesfully approved transaction to delete a product');
            console.log(result);
            full_data = JSON.parse(localStorage['pending_transactions'])
            full_data = $.merge(full_data, [{'type' : 'deleteProduct', 'hash' : result, 'status' : 'pending', 'metadata' : sessionStorage['contract_address'] + sessionStorage['product_id'], 'account' : sessionStorage['account_address']}]);
            localStorage['pending_transactions'] = JSON.stringify(full_data)
        } else {
            console.log('error');
        }
    });
}



function createProduct(){
    $(create_product_modal).modal('show');
}


function createPaymentContractPopup(){
    sessionStorage['new_store_name']=''
    $(create_store_modal).modal('show');
}

function payPreview(data){
    product_id = data.getAttribute("product_id")
    products = JSON.parse(sessionStorage['products'])
    product_to_display = {}
    for (i = 0, len = products.length; i < len; i++) {
        if(products[i]['_id']==parseInt(product_id)){
            product_to_display = products[i]
        }
    }

    // generate a random customer id
    customer_id = 'customer_' + (Math.floor(Math.random() * 6)).toString()+(Math.floor(Math.random() * 6)).toString()+(Math.floor(Math.random() * 6)).toString()+(Math.floor(Math.random() * 6)).toString()+(Math.floor(Math.random() * 6)).toString()
    
    document.getElementById("pay_product_name").innerHTML = 'Buy ' + product_to_display['name']
    document.getElementById("pay_product_description").innerHTML = product_to_display['description']
    document.getElementById("pay_product_priceInEth").innerHTML = (product_to_display['priceInWei']/ Math.pow(10, 18)).toString() + ' ETH'
    document.getElementById("pay_product_priceInWei").innerHTML = product_to_display['priceInWei'].toString() + ' Wei'
    document.getElementById("pay_product_pay_button").innerHTML = 'Pay ' + (product_to_display['priceInWei']/ Math.pow(10, 18)).toString() + ' ETH'
    $(pay_product_pay_button).attr("product_id" , product_to_display['_id'])
    $(pay_product_pay_button).attr("contract_address" , sessionStorage['contract_address'])
    $(pay_product_pay_button).attr("priceInWei" , product_to_display['priceInWei'])
    $(pay_product_pay_button).attr("customer_id" , customer_id)
    $(pay_product_pay_button).attr("account_address" , sessionStorage['account_address'])
        
    $(pay_preview_modal).modal('show');

}


function pay(data){
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
        } else {
            console.log('error');
        }
    });
}





// Temporarily save the new product name
function updateProductName(user_input){
    sessionStorage['new_product_name']=user_input.value
}

// Temporarily save the new product description
function updateProductDescription(user_input){
    sessionStorage['new_product_description']=user_input.value
}

// Temporarily save the new product price
function updateProductPrice(user_input){
    sessionStorage['new_product_price']=parseFloat(user_input.value)
}

// Temporarily save the new store name
function updateStoreName(user_input){
    sessionStorage['new_store_name']=user_input.value
}


// function to save a new product in the store
function saveProduct() {
    account = sessionStorage['account_address']
    web3.eth.defaultAccount = account;
    new_product_name = sessionStorage['new_product_name']
    new_product_description = sessionStorage['new_product_description']
    new_product_price = sessionStorage['new_product_price']
    
    var PaymentContract = web3.eth.contract(PAYMENTCONTRACT_ABI);
    var PaymentContractInstance = PaymentContract.at(contract_address);
    PaymentContractInstance.createProduct(new_product_name, new_product_description, new_product_price * Math.pow(10, 18), function(error, result) {
        if (!error){
            console.log('Succesfully approved transaction to create a new product');
            console.log(result);
            full_data = JSON.parse(localStorage['pending_transactions'])
            full_data = $.merge(full_data, [{'type' : 'createProduct', 'hash' : result, 'status' : 'pending', 'metadata' : sessionStorage['contract_address'], 'account' : sessionStorage['account_address']}]);
            localStorage['pending_transactions'] = JSON.stringify(full_data)
        } else {
            console.log('error');
        }
    });

}

// strore transaction as it is transmitted
function store_transaction(tx_type, tx_hash, account){
    $.ajax({
        url :'/store_transaction',
        type : 'GET',
        data : { tx_type : tx_type, tx_hash : tx_hash, account : account},
        }).done(function(data) {
        });
}





function create_fingerprint(){
    var nav = window.navigator;
    var screen = window.screen;
    
    sessionStorage['mimeTypeslength'] = nav.mimeTypes.length
    sessionStorage['userAgent'] = nav.userAgent.replace(/\D+/g, '')
    sessionStorage['pluginslength'] = nav.plugins.length
    sessionStorage['screenheight'] = screen.height
    sessionStorage['screenwidth'] = screen.width
    sessionStorage['screenpixelDepth'] = screen.pixelDepth
    sessionStorage['appCodeName'] = nav.appCodeName
    sessionStorage['appName'] = nav.appName
    sessionStorage['appVersion'] = nav.appVersion
    sessionStorage['cookieEnabled'] = nav.cookieEnabled
    sessionStorage['geolocation'] = nav.geolocation
    sessionStorage['language'] = nav.language
    sessionStorage['onLine'] = nav.onLine
    sessionStorage['platform'] = nav.platform
    sessionStorage['product'] = nav.product
    
    var fp = new Fingerprint({
      canvas: true,
      ie_activex: true,
      screen_resolution: true
    });
    
    var uid = fp.get();
    sessionStorage['uid'] = uid
    console.log(uid)
};




/*
***************************************************
** http://davealger.info
***************************************************

This is a javascript only way to fingerprint a user with better than 90% accuracy in as few bytes as possible and no cookie storage!

Special thanks to Valentin Vasilyev for the original fingerprintjs slightly modified and to Open Source Device Fingerprinting by Dark Wave Tech for the various identity functions

***************************************************
*/

;(function(name,context,definition) { if (typeof module !== 'undefined' && module.exports) { module.exports = definition(); } else if (typeof define === 'function' && define.amd) { define(definition); } else { context[name] = definition(); } } ) ('Fingerprint', this, function() { 'use strict'; var Fingerprint = function(options) { var nativeForEach, nativeMap; nativeForEach = Array.prototype.forEach; nativeMap = Array.prototype.map; this.each = function(obj, iterator, context) { if (obj === null) { return; } if (nativeForEach && obj.forEach === nativeForEach) { obj.forEach(iterator, context); } else if (obj.length === +obj.length) { for (var i = 0, l = obj.length; i < l; i++) { if (iterator.call(context, obj[i], i, obj) === {}) return; } } else { for (var key in obj) { if (obj.hasOwnProperty(key)) { if (iterator.call(context, obj[key], key, obj) === {}) return; } } } }; this.map = function(obj, iterator, context) { var results = []; if (obj == null) return results; if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context); this.each(obj, function(value, index, list) { results[results.length] = iterator.call(context, value, index, list); }); return results; }; if (typeof options == 'object') { this.hasher = options.hasher; this.screen_resolution = options.screen_resolution; this.screen_orientation = options.screen_orientation; this.canvas = options.canvas; this.ie_activex = options.ie_activex; } else if (typeof options == 'function') { this.hasher = options; } }; Fingerprint.prototype = { get: function() { var keys = []; keys.push(navigator.userAgent); keys.push(navigator.language); keys.push(screen.colorDepth); if (this.screen_resolution) { var resolution = this.getScreenResolution(); if (typeof resolution !== 'undefined') { keys.push(this.getScreenResolution().join('x')); } } keys.push(new Date().getTimezoneOffset()); keys.push(this.hasSessionStorage()); keys.push(this.hasLocalStorage()); keys.push(!!window.indexedDB); if (document.body) { keys.push(typeof(document.body.addBehavior)); } else { keys.push(typeof undefined); } keys.push(typeof(window.openDatabase)); keys.push(navigator.cpuClass); keys.push(navigator.platform); keys.push(navigator.doNotTrack); keys.push(this.getPluginsString()); if (this.canvas && this.isCanvasSupported()) { keys.push(this.getCanvasFingerprint()); } if (this.hasher) { return this.hasher(keys.join('###'), 31); } else { return this.murmurhash3_32_gc(keys.join('###'), 31); } }, murmurhash3_32_gc: function(key, seed) { var remainder, bytes, h1, h1b, c1, c2, k1, i; remainder = key.length & 3; bytes = key.length - remainder; h1 = seed; c1 = 0xcc9e2d51; c2 = 0x1b873593; i = 0; while (i < bytes) { k1 = ((key.charCodeAt(i) & 0xff)) | ((key.charCodeAt(++i) & 0xff) << 8) | ((key.charCodeAt(++i) & 0xff) << 16) | ((key.charCodeAt(++i) & 0xff) << 24); ++i; k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff; k1 = (k1 << 15) | (k1 >>> 17); k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff; h1 ^= k1; h1 = (h1 << 13) | (h1 >>> 19); h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff; h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16)); } k1 = 0; switch (remainder) { case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16; case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8; case 1: k1 ^= (key.charCodeAt(i) & 0xff); k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff; k1 = (k1 << 15) | (k1 >>> 17); k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff; h1 ^= k1; } h1 ^= key.length; h1 ^= h1 >>> 16; h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff; h1 ^= h1 >>> 13; h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff; h1 ^= h1 >>> 16; return h1 >>> 0; }, hasLocalStorage: function() { try { return !!window.localStorage; } catch (e) { return true; } }, hasSessionStorage: function() { try { return !!window.sessionStorage; } catch (e) { return true; } }, isCanvasSupported: function() { var elem = document.createElement('canvas'); return !!(elem.getContext && elem.getContext('2d')); }, isIE: function() { if (navigator.appName === 'Microsoft Internet Explorer') { return true; } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) { return true; } return false; }, getPluginsString: function() { if (this.isIE() && this.ie_activex) { return this.getIEPluginsString(); } else { return this.getRegularPluginsString(); } }, getRegularPluginsString: function() { return this.map(navigator.plugins, function(p) { var mimeTypes = this.map(p, function(mt) { return [mt.type, mt.suffixes].join('~'); }).join(','); return [p.name, p.description, mimeTypes].join('::'); }, this).join(';'); }, getIEPluginsString: function() { if (window.ActiveXObject) { var names = ['ShockwaveFlash.ShockwaveFlash', 'AcroPDF.PDF', 'PDF.PdfCtrl', 'QuickTime.QuickTime', 'rmocx.RealPlayer G2 Control', 'rmocx.RealPlayer G2 Control.1', 'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)', 'RealVideo.RealVideo(tm) ActiveX Control (32-bit)', 'RealPlayer', 'SWCtl.SWCtl', 'WMPlayer.OCX', 'AgControl.AgControl', 'Skype.Detection' ]; return this.map(names, function(name) { try { new ActiveXObject(name); return name; } catch (e) { return null; } }).join(';'); } else { return ""; } }, getScreenResolution: function() { var resolution; if (this.screen_orientation) { resolution = (screen.height > screen.width) ? [screen.height, screen.width] : [screen.width, screen.height]; } else { resolution = [screen.height, screen.width]; } return resolution; }, getCanvasFingerprint: function() { var canvas = document.createElement('canvas'); var ctx = canvas.getContext('2d'); var txt = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-={}|[]\:"<>?;,.'; ctx.textBaseline = "top"; ctx.font = "14px 'Arial'"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#f60"; ctx.fillRect(125, 1, 62, 20); ctx.fillStyle = "#069"; ctx.fillText(txt, 2, 15); ctx.fillStyle = "rgba(102, 204, 0, 0.7)"; ctx.fillText(txt, 4, 17); return canvas.toDataURL(); } }; return Fingerprint;});
/**************************************************/




/**
http://www.darkwavetech.com/fingerprint/fingerprint_code.html
**/
function fingerprint_flash() {
    "use strict";
    var strOnError, objPlayerVersion, strVersion, strOut;

    strOnError = "N/A";
    objPlayerVersion = null;
    strVersion = null;
    strOut = null;

    try {
        objPlayerVersion = swfobject.getFlashPlayerVersion();
        strVersion = objPlayerVersion.major + "." + objPlayerVersion.minor + "." + objPlayerVersion.release;
        if (strVersion === "0.0.0") {
            strVersion = "N/A";
        }
        strOut = strVersion;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}


function fingerprint_browser() {
    "use strict";
    var strOnError, strUserAgent, numVersion, strBrowser, strOut;

    strOnError = "Error";
    strUserAgent = null;
    numVersion = null;
    strBrowser  = null;
    strOut = null;

    try {
        strUserAgent = navigator.userAgent.toLowerCase();
        if (/msie (\d+\.\d+);/.test(strUserAgent)) { //test for MSIE x.x;
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            if (strUserAgent.indexOf("trident/6") > -1) {
                numVersion = 10;
            }
            if (strUserAgent.indexOf("trident/5") > -1) {
                numVersion = 9;
            }
            if (strUserAgent.indexOf("trident/4") > -1) {
                numVersion = 8;
            }
            strBrowser = "Internet Explorer " + numVersion;
        } else if (strUserAgent.indexOf("trident/7") > -1) { //IE 11+ gets rid of the legacy 'MSIE' in the user-agent string;
            numVersion = 11;
            strBrowser = "Internet Explorer " + numVersion;
        }  else if (/firefox[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Firefox " + numVersion;
        } else if (/opera[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Opera/x.x or Opera x.x (ignoring remaining decimal places);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Opera " + numVersion;
        } else if (/chrome[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Chrome/x.x or Chrome x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Chrome " + numVersion;
        } else if (/version[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Version/x.x or Version x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Safari " + numVersion;
        } else if (/rv[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for rv/x.x or rv x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Mozilla " + numVersion;
        } else if (/mozilla[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Mozilla/x.x or Mozilla x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Mozilla " + numVersion;
        } else if (/binget[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for BinGet/x.x or BinGet x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (BinGet) " + numVersion;
        } else if (/curl[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Curl/x.x or Curl x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (cURL) " + numVersion;
        } else if (/java[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Java/x.x or Java x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (Java) " + numVersion;
        } else if (/libwww-perl[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for libwww-perl/x.x or libwww-perl x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (libwww-perl) " + numVersion;
        } else if (/microsoft url control -[\s](\d+\.\d+)/.test(strUserAgent)) { //test for Microsoft URL Control - x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (Microsoft URL Control) " + numVersion;
        } else if (/peach[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for Peach/x.x or Peach x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (Peach) " + numVersion;
        } else if (/php[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for PHP/x.x or PHP x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (PHP) " + numVersion;
        } else if (/pxyscand[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for pxyscand/x.x or pxyscand x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (pxyscand) " + numVersion;
        } else if (/pycurl[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for pycurl/x.x or pycurl x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (PycURL) " + numVersion;
        } else if (/python-urllib[\/\s](\d+\.\d+)/.test(strUserAgent)) { //test for python-urllib/x.x or python-urllib x.x (ignoring remaining digits);
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Library (Python URLlib) " + numVersion;
        } else if (/appengine-google/.test(strUserAgent)) { //test for AppEngine-Google;
            numVersion = Number(RegExp.$1); // capture x.x portion and store as a number
            strBrowser = "Cloud (Google AppEngine) " + numVersion;
        } else {
            strBrowser = "Unknown";
        }
        strOut = strBrowser;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}

function fingerprint_canvas() {
    "use strict";
    var strOnError, canvas, strCText, strText, strOut;

    strOnError = "Error";
    canvas = null;
    strCText = null;
    strText = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~1!2@3#4$5%6^7&8*9(0)-_=+[{]}|;:',<.>/?";
    strOut = null;

    try {
        canvas = document.createElement('canvas');
        strCText = canvas.getContext('2d');
        strCText.textBaseline = "top";
        strCText.font = "14px 'Arial'";
        strCText.textBaseline = "alphabetic";
        strCText.fillStyle = "#f60";
        strCText.fillRect(125, 1, 62, 20);
        strCText.fillStyle = "#069";
        strCText.fillText(strText, 2, 15);
        strCText.fillStyle = "rgba(102, 204, 0, 0.7)";
        strCText.fillText(strText, 4, 17);
        strOut = canvas.toDataURL();
        return strOut;
    } catch (err) {
        return strOnError;
    }
}


function fingerprint_connection() {
    "use strict";
    var strOnError, strConnection, strOut;

    strOnError = "N/A";
    strConnection = null;
    strOut = null;

    try {
		// only on android
        strConnection = navigator.connection.type;
        strOut = strConnection;
    } catch (err) {
		// return N/A if navigator.connection object does not apply to this device
        return strOnError;
    }
    return strOut;
}


function fingerprint_cookie() {
    "use strict";
    var strOnError, bolCookieEnabled, bolOut;

    strOnError = "Error";
    bolCookieEnabled = null;
    bolOut = null;

    try {
        bolCookieEnabled = (navigator.cookieEnabled) ? true : false;

        //if not IE4+ nor NS6+
        if (typeof navigator.cookieEnabled === "undefined" && !bolCookieEnabled) {
            document.cookie = "testcookie";
            bolCookieEnabled = (document.cookie.indexOf("testcookie") !== -1) ? true : false;
        }
        bolOut = bolCookieEnabled;
        return bolOut;
    } catch (err) {
        return strOnError;
    }
}



function fingerprint_display() {
    "use strict";
    var strSep, strPair, strOnError, strScreen, strDisplay, strOut;

    strSep = "|";
    strPair = "=";
    strOnError = "Error";
    strScreen = null;
    strDisplay = null;
    strOut = null;

    try {
        strScreen = window.screen;
        if (strScreen) {
            strDisplay = strScreen.colorDepth + strSep + strScreen.width + strSep + strScreen.height + strSep + strScreen.availWidth + strSep + strScreen.availHeight;
        }
        strOut = strDisplay;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}

function fingerprint_fontsmoothing() {
    "use strict";
    var strOnError, strFontSmoothing, canvasNode, ctx, i, j, imageData, alpha, strOut;

    strOnError = "Unknown";
    strFontSmoothing = null;
    canvasNode = null;
    ctx = null;
    imageData = null;
    alpha = null;
    strOut = null;

    if (typeof(screen.fontSmoothingEnabled) !== "undefined") {
        strFontSmoothing = screen.fontSmoothingEnabled;
    } else {
        try {
			fontsmoothing = "false";
            canvasNode = document.createElement('canvas');
            canvasNode.width = "35";
            canvasNode.height = "35";
            canvasNode.style.display = 'none';
            document.body.appendChild(canvasNode);
            ctx = canvasNode.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "32px Arial";
            ctx.fillStyle = "black";
            ctx.strokeStyle = "black";
            ctx.fillText("O", 0, 0);
            for (j = 8; j <= 32; j = j + 1) {
                for (i = 1; i <= 32; i = i + 1) {
                    imageData = ctx.getImageData(i, j, 1, 1).data;
                    alpha = imageData[3];
                    if (alpha !== 255 && alpha !== 0) {
                        strFontSmoothing = "true"; // font-smoothing must be on.
                    }
                }
            }
            strOut = strFontSmoothing;
        } catch (err) {
            return strOnError;
        }
    }
    strOut = strFontSmoothing;
    return strOut;
}

function fingerprint_fonts() {
    "use strict";
    var strOnError, style, fonts, count, template, fragment, divs, i, font, div, body, result, e;

    strOnError = "Error";
    style = null;
    fonts = null;
    font = null;
    count = 0;
    template = null;
    divs = null;
    e = null;
    div = null;
    body = null;
    i = 0;

    try {
        style = "position: absolute; visibility: hidden; display: block !important";
        fonts = ["Abadi MT Condensed Light", "Adobe Fangsong Std", "Adobe Hebrew", "Adobe Ming Std", "Agency FB", "Aharoni", "Andalus", "Angsana New", "AngsanaUPC", "Aparajita", "Arab", "Arabic Transparent", "Arabic Typesetting", "Arial Baltic", "Arial Black", "Arial CE", "Arial CYR", "Arial Greek", "Arial TUR", "Arial", "Batang", "BatangChe", "Bauhaus 93", "Bell MT", "Bitstream Vera Serif", "Bodoni MT", "Bookman Old Style", "Braggadocio", "Broadway", "Browallia New", "BrowalliaUPC", "Calibri Light", "Calibri", "Californian FB", "Cambria Math", "Cambria", "Candara", "Castellar", "Casual", "Centaur", "Century Gothic", "Chalkduster", "Colonna MT", "Comic Sans MS", "Consolas", "Constantia", "Copperplate Gothic Light", "Corbel", "Cordia New", "CordiaUPC", "Courier New Baltic", "Courier New CE", "Courier New CYR", "Courier New Greek", "Courier New TUR", "Courier New", "DFKai-SB", "DaunPenh", "David", "DejaVu LGC Sans Mono", "Desdemona", "DilleniaUPC", "DokChampa", "Dotum", "DotumChe", "Ebrima", "Engravers MT", "Eras Bold ITC", "Estrangelo Edessa", "EucrosiaUPC", "Euphemia", "Eurostile", "FangSong", "Forte", "FrankRuehl", "Franklin Gothic Heavy", "Franklin Gothic Medium", "FreesiaUPC", "French Script MT", "Gabriola", "Gautami", "Georgia", "Gigi", "Gisha", "Goudy Old Style", "Gulim", "GulimChe", "GungSeo", "Gungsuh", "GungsuhChe", "Haettenschweiler", "Harrington", "Hei S", "HeiT", "Heisei Kaku Gothic", "Hiragino Sans GB", "Impact", "Informal Roman", "IrisUPC", "Iskoola Pota", "JasmineUPC", "KacstOne", "KaiTi", "Kalinga", "Kartika", "Khmer UI", "Kino MT", "KodchiangUPC", "Kokila", "Kozuka Gothic Pr6N", "Lao UI", "Latha", "Leelawadee", "Levenim MT", "LilyUPC", "Lohit Gujarati", "Loma", "Lucida Bright", "Lucida Console", "Lucida Fax", "Lucida Sans Unicode", "MS Gothic", "MS Mincho", "MS PGothic", "MS PMincho", "MS Reference Sans Serif", "MS UI Gothic", "MV Boli", "Magneto", "Malgun Gothic", "Mangal", "Marlett", "Matura MT Script Capitals", "Meiryo UI", "Meiryo", "Menlo", "Microsoft Himalaya", "Microsoft JhengHei", "Microsoft New Tai Lue", "Microsoft PhagsPa", "Microsoft Sans Serif", "Microsoft Tai Le", "Microsoft Uighur", "Microsoft YaHei", "Microsoft Yi Baiti", "MingLiU", "MingLiU-ExtB", "MingLiU_HKSCS", "MingLiU_HKSCS-ExtB", "Miriam Fixed", "Miriam", "Mongolian Baiti", "MoolBoran", "NSimSun", "Narkisim", "News Gothic MT", "Niagara Solid", "Nyala", "PMingLiU", "PMingLiU-ExtB", "Palace Script MT", "Palatino Linotype", "Papyrus", "Perpetua", "Plantagenet Cherokee", "Playbill", "Prelude Bold", "Prelude Condensed Bold", "Prelude Condensed Medium", "Prelude Medium", "PreludeCompressedWGL Black", "PreludeCompressedWGL Bold", "PreludeCompressedWGL Light", "PreludeCompressedWGL Medium", "PreludeCondensedWGL Black", "PreludeCondensedWGL Bold", "PreludeCondensedWGL Light", "PreludeCondensedWGL Medium", "PreludeWGL Black", "PreludeWGL Bold", "PreludeWGL Light", "PreludeWGL Medium", "Raavi", "Rachana", "Rockwell", "Rod", "Sakkal Majalla", "Sawasdee", "Script MT Bold", "Segoe Print", "Segoe Script", "Segoe UI Light", "Segoe UI Semibold", "Segoe UI Symbol", "Segoe UI", "Shonar Bangla", "Showcard Gothic", "Shruti", "SimHei", "SimSun", "SimSun-ExtB", "Simplified Arabic Fixed", "Simplified Arabic", "Snap ITC", "Sylfaen", "Symbol", "Tahoma", "Times New Roman Baltic", "Times New Roman CE", "Times New Roman CYR", "Times New Roman Greek", "Times New Roman TUR", "Times New Roman", "TlwgMono", "Traditional Arabic", "Trebuchet MS", "Tunga", "Tw Cen MT Condensed Extra Bold", "Ubuntu", "Umpush", "Univers", "Utopia", "Utsaah", "Vani", "Verdana", "Vijaya", "Vladimir Script", "Vrinda", "Webdings", "Wide Latin", "Wingdings"];
        count = fonts.length;
        template = '<b style="display:inline !important; width:auto !important; font:normal 10px/1 \'X\',sans-serif !important">ww</b>' + '<b style="display:inline !important; width:auto !important; font:normal 10px/1 \'X\',monospace !important">ww</b>';
        fragment = document.createDocumentFragment();
        divs = [];
        for (i = 0; i < count; i = i + 1) {
            font = fonts[i];
            div = document.createElement('div');
            font = font.replace(/['"<>]/g, '');
            div.innerHTML = template.replace(/X/g, font);
            div.style.cssText = style;
            fragment.appendChild(div);
            divs.push(div);
        }
        body = document.body;
        body.insertBefore(fragment, body.firstChild);
        result = [];
        for (i = 0; i < count; i = i + 1) {
            e = divs[i].getElementsByTagName('b');
            if (e[0].offsetWidth === e[1].offsetWidth) {
                result.push(fonts[i]);
            }
        }
        // do not combine these two loops, remove child will cause reflow
        // and induce severe performance hit
        for (i = 0; i < count; i = i + 1) {
            body.removeChild(divs[i]);
        }
        return result.join('|');
    } catch (err) {
        return strOnError;
    }
}

function fingerprint_formfields() {
    "use strict";
    var i, j, numOfForms, numOfInputs, strFormsInPage, strFormsInputsData, strInputsInForm, strTmp, strOut;

    i = 0;
    j = 0;
    numOfForms = 0;
    numOfInputs = 0;
    strFormsInPage = "";
    strFormsInputsData = [];
    strInputsInForm = "";
    strTmp = "";
    strOut = "";

    strFormsInPage = document.getElementsByTagName('form');
    numOfForms = strFormsInPage.length;
    strFormsInputsData.push("url=" + window.location.href);
    for (i = 0; i < numOfForms; i = i + 1) {
        strFormsInputsData.push("FORM=" + strFormsInPage[i].name);
        strInputsInForm = strFormsInPage[i].getElementsByTagName('input');
        numOfInputs = strInputsInForm.length;
        for (j = 0; j < numOfInputs; j = j + 1) {
            if (strInputsInForm[j].type !== "hidden") {
                strFormsInputsData.push("Input=" + strInputsInForm[j].name);
            }
        }
    }
    strTmp = strFormsInputsData.join("|");
    strOut = strTmp;
    return strOut;
}

function fingerprint_java() {
    "use strict";
    var strOnError, strJavaEnabled, strOut;

    strOnError = "Error";
    strJavaEnabled = null;
    strOut = null;

    try {
        if (navigator.javaEnabled()) {
            strJavaEnabled = "true";
        } else {
            strJavaEnabled = "false";
        }
        strOut = strJavaEnabled;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}

function fingerprint_language() {
    "use strict";
    var strSep, strPair, strOnError, strLang, strTypeLng, strTypeBrLng, strTypeSysLng, strTypeUsrLng, strOut;

    strSep = "|";
    strPair = "=";
    strOnError = "Error";
    strLang = null;
    strTypeLng = null;
    strTypeBrLng = null;
    strTypeSysLng = null;
    strTypeUsrLng = null;
    strOut = null;

    try {
        strTypeLng = typeof (navigator.language);
        strTypeBrLng = typeof (navigator.browserLanguage);
        strTypeSysLng = typeof (navigator.systemLanguage);
        strTypeUsrLng = typeof (navigator.userLanguage);

        if (strTypeLng !== "undefined") {
            strLang = "lang" + strPair + navigator.language + strSep;
        } else if (strTypeBrLng !== "undefined") {
            strLang = "lang" + strPair + navigator.browserLanguage + strSep;
        } else {
            strLang = "lang" + strPair + strSep;
        }
        if (strTypeSysLng !== "undefined") {
            strLang += "syslang" + strPair + navigator.systemLanguage + strSep;
        } else {
            strLang += "syslang" + strPair + strSep;
        }
        if (strTypeUsrLng !== "undefined") {
            strLang += "userlang" + strPair + navigator.userLanguage;
        } else {
            strLang += "userlang" + strPair;
        }
        strOut = strLang;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}

function fingerprint_silverlight() {
    "use strict";
    var strOnError, objControl, objPlugin, strSilverlightVersion, strOut;

    strOnError = "Error";
    objControl = null;
    objPlugin = null;
    strSilverlightVersion = null;
    strOut = null;

    try {
        try {
            objControl = new ActiveXObject('AgControl.AgControl');
            if (objControl.IsVersionSupported("5.0")) {
                strSilverlightVersion = "5.x";
            } else if (objControl.IsVersionSupported("4.0")) {
                strSilverlightVersion = "4.x";
            } else if (objControl.IsVersionSupported("3.0")) {
                strSilverlightVersion = "3.x";
            } else if (objControl.IsVersionSupported("2.0")) {
                strSilverlightVersion = "2.x";
            } else {
                strSilverlightVersion = "1.x";
            }
            objControl = null;
        } catch (e) {
            objPlugin = navigator.plugins["Silverlight Plug-In"];
            if (objPlugin) {
                if (objPlugin.description === "1.0.30226.2") {
                    strSilverlightVersion = "2.x";
                } else {
                    strSilverlightVersion = parseInt(objPlugin.description[0], 10);
                }
            } else {
                strSilverlightVersion = "N/A";
            }
        }
        strOut = strSilverlightVersion;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}

function fingerprint_os() {
    "use strict";
    var strSep, strOnError, strUserAgent, strPlatform, strOS, strOSBits, strOut;

    strSep = "|";
    strOnError = "Error";
    strUserAgent = null;
    strPlatform = null;
    strOS = null;
    strOSBits = null;
    strOut = null;

    try {
        /* navigator.userAgent is supported by all major browsers */
        strUserAgent = navigator.userAgent.toLowerCase();
        /* navigator.platform is supported by all major browsers */
        strPlatform = navigator.platform.toLowerCase();
        if (strUserAgent.indexOf("windows nt 6.3") !== -1) {
            strOS = "Windows 8.1";
        } else if (strUserAgent.indexOf("windows nt 6.2") !== -1) {
            strOS = "Windows 8";
        } else if (strUserAgent.indexOf("windows nt 6.1") !== -1) {
            strOS = "Windows 7";
        } else if (strUserAgent.indexOf("windows nt 6.0") !== -1) {
            strOS = "Windows Vista/Windows Server 2008";
        } else if (strUserAgent.indexOf("windows nt 5.2") !== -1) {
            strOS = "Windows XP x64/Windows Server 2003";
        } else if (strUserAgent.indexOf("windows nt 5.1") !== -1) {
            strOS = "Windows XP";
        } else if (strUserAgent.indexOf("windows nt 5.01") !== -1) {
            strOS = "Windows 2000, Service Pack 1 (SP1)";
        } else if (strUserAgent.indexOf("windows xp") !== -1) {
            strOS = "Windows XP";
        } else if (strUserAgent.indexOf("windows 2000") !== -1) {
            strOS = "Windows 2000";
        } else if (strUserAgent.indexOf("windows nt 5.0") !== -1) {
            strOS = "Windows 2000";
        } else if (strUserAgent.indexOf("windows nt 4.0") !== -1) {
            strOS = "Windows NT 4.0";
        } else if (strUserAgent.indexOf("windows nt") !== -1) {
            strOS = "Windows NT 4.0";
        } else if (strUserAgent.indexOf("winnt4.0") !== -1) {
            strOS = "Windows NT 4.0";
        } else if (strUserAgent.indexOf("winnt") !== -1) {
            strOS = "Windows NT 4.0";
        } else if (strUserAgent.indexOf("windows me") !== -1) {
            strOS = "Windows ME";
        } else if (strUserAgent.indexOf("win 9x 4.90") !== -1) {
            strOS = "Windows ME";
        } else if (strUserAgent.indexOf("windows 98") !== -1) {
            strOS = "Windows 98";
        } else if (strUserAgent.indexOf("win98") !== -1) {
            strOS = "Windows 98";
        } else if (strUserAgent.indexOf("windows 95") !== -1) {
            strOS = "Windows 95";
        } else if (strUserAgent.indexOf("windows_95") !== -1) {
            strOS = "Windows 95";
        } else if (strUserAgent.indexOf("win95") !== -1) {
            strOS = "Windows 95";
        } else if (strUserAgent.indexOf("ce") !== -1) {
            strOS = "Windows CE";
        } else if (strUserAgent.indexOf("win16") !== -1) {
            strOS = "Windows 3.11";
        } else if (strUserAgent.indexOf("iemobile") !== -1) {
            strOS = "Windows Mobile";
        } else if (strUserAgent.indexOf("wm5 pie") !== -1) {
            strOS = "Windows Mobile";
        } else if (strUserAgent.indexOf("windows") !== -1) {
            strOS = "Windows (Unknown Version)";
        } else if (strUserAgent.indexOf("openbsd") !== -1) {
            strOS = "Open BSD";
        } else if (strUserAgent.indexOf("sunos") !== -1) {
            strOS = "Sun OS";
        } else if (strUserAgent.indexOf("ubuntu") !== -1) {
            strOS = "Ubuntu";
        } else if (strUserAgent.indexOf("ipad") !== -1) {
            strOS = "iOS (iPad)";
        } else if (strUserAgent.indexOf("ipod") !== -1) {
            strOS = "iOS (iTouch)";
        } else if (strUserAgent.indexOf("iphone") !== -1) {
            strOS = "iOS (iPhone)";
        } else if (strUserAgent.indexOf("mac os x beta") !== -1) {
            strOS = "Mac OSX Beta (Kodiak)";
        } else if (strUserAgent.indexOf("mac os x 10.0") !== -1) {
            strOS = "Mac OSX Cheetah";
        } else if (strUserAgent.indexOf("mac os x 10.1") !== -1) {
            strOS = "Mac OSX Puma";
        } else if (strUserAgent.indexOf("mac os x 10.2") !== -1) {
            strOS = "Mac OSX Jaguar";
        } else if (strUserAgent.indexOf("mac os x 10.3") !== -1) {
            strOS = "Mac OSX Panther";
        } else if (strUserAgent.indexOf("mac os x 10.4") !== -1) {
            strOS = "Mac OSX Tiger";
        } else if (strUserAgent.indexOf("mac os x 10.5") !== -1) {
            strOS = "Mac OSX Leopard";
        } else if (strUserAgent.indexOf("mac os x 10.6") !== -1) {
            strOS = "Mac OSX Snow Leopard";
        } else if (strUserAgent.indexOf("mac os x 10.7") !== -1) {
            strOS = "Mac OSX Lion";
        } else if (strUserAgent.indexOf("mac os x") !== -1) {
            strOS = "Mac OSX (Version Unknown)";
        } else if (strUserAgent.indexOf("mac_68000") !== -1) {
            strOS = "Mac OS Classic (68000)";
        } else if (strUserAgent.indexOf("68K") !== -1) {
            strOS = "Mac OS Classic (68000)";
        } else if (strUserAgent.indexOf("mac_powerpc") !== -1) {
            strOS = "Mac OS Classic (PowerPC)";
        } else if (strUserAgent.indexOf("ppc mac") !== -1) {
            strOS = "Mac OS Classic (PowerPC)";
        } else if (strUserAgent.indexOf("macintosh") !== -1) {
            strOS = "Mac OS Classic";
        } else if (strUserAgent.indexOf("googletv") !== -1) {
            strOS = "Android (GoogleTV)";
        } else if (strUserAgent.indexOf("xoom") !== -1) {
            strOS = "Android (Xoom)";
        } else if (strUserAgent.indexOf("htc_flyer") !== -1) {
            strOS = "Android (HTC Flyer)";
        } else if (strUserAgent.indexOf("android") !== -1) {
            strOS = "Android";
        } else if (strUserAgent.indexOf("symbian") !== -1) {
            strOS = "Symbian";
        } else if (strUserAgent.indexOf("series60") !== -1) {
            strOS = "Symbian (Series 60)";
        } else if (strUserAgent.indexOf("series70") !== -1) {
            strOS = "Symbian (Series 70)";
        } else if (strUserAgent.indexOf("series80") !== -1) {
            strOS = "Symbian (Series 80)";
        } else if (strUserAgent.indexOf("series90") !== -1) {
            strOS = "Symbian (Series 90)";
        } else if (strUserAgent.indexOf("x11") !== -1) {
            strOS = "UNIX";
        } else if (strUserAgent.indexOf("nix") !== -1) {
            strOS = "UNIX";
        } else if (strUserAgent.indexOf("linux") !== -1) {
            strOS = "Linux";
        } else if (strUserAgent.indexOf("qnx") !== -1) {
            strOS = "QNX";
        } else if (strUserAgent.indexOf("os/2") !== -1) {
            strOS = "IBM OS/2";
        } else if (strUserAgent.indexOf("beos") !== -1) {
            strOS = "BeOS";
        } else if (strUserAgent.indexOf("blackberry95") !== -1) {
            strOS = "Blackberry (Storm 1/2)";
        } else if (strUserAgent.indexOf("blackberry97") !== -1) {
            strOS = "Blackberry (Bold)";
        } else if (strUserAgent.indexOf("blackberry96") !== -1) {
            strOS = "Blackberry (Tour)";
        } else if (strUserAgent.indexOf("blackberry89") !== -1) {
            strOS = "Blackberry (Curve 2)";
        } else if (strUserAgent.indexOf("blackberry98") !== -1) {
            strOS = "Blackberry (Torch)";
        } else if (strUserAgent.indexOf("playbook") !== -1) {
            strOS = "Blackberry (Playbook)";
        } else if (strUserAgent.indexOf("wnd.rim") !== -1) {
            strOS = "Blackberry (IE/FF Emulator)";
        } else if (strUserAgent.indexOf("blackberry") !== -1) {
            strOS = "Blackberry";
        } else if (strUserAgent.indexOf("palm") !== -1) {
            strOS = "Palm OS";
        } else if (strUserAgent.indexOf("webos") !== -1) {
            strOS = "WebOS";
        } else if (strUserAgent.indexOf("hpwos") !== -1) {
            strOS = "WebOS (HP)";
        } else if (strUserAgent.indexOf("blazer") !== -1) {
            strOS = "Palm OS (Blazer)";
        } else if (strUserAgent.indexOf("xiino") !== -1) {
            strOS = "Palm OS (Xiino)";
        } else if (strUserAgent.indexOf("kindle") !== -1) {
            strOS = "Kindle";
        } else if (strUserAgent.indexOf("wii") !== -1) {
            strOS = "Nintendo (Wii)";
        } else if (strUserAgent.indexOf("nintendo ds") !== -1) {
            strOS = "Nintendo (DS)";
        } else if (strUserAgent.indexOf("playstation 3") !== -1) {
            strOS = "Sony (Playstation Console)";
        } else if (strUserAgent.indexOf("playstation portable") !== -1) {
            strOS = "Sony (Playstation Portable)";
        } else if (strUserAgent.indexOf("webtv") !== -1) {
            strOS = "MSN TV (WebTV)";
        } else if (strUserAgent.indexOf("inferno") !== -1) {
            strOS = "Inferno";
        } else {
            strOS = "Unknown";
        }
        if (strPlatform.indexOf("x64") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("wow64") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("win64") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("win32") !== -1) {
            strOSBits = "32 bits";
        } else if (strPlatform.indexOf("x64") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("x32") !== -1) {
            strOSBits = "32 bits";
        } else if (strPlatform.indexOf("x86") !== -1) {
            strOSBits = "32 bits*";
        } else if (strPlatform.indexOf("ppc") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("alpha") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("68k") !== -1) {
            strOSBits = "64 bits";
        } else if (strPlatform.indexOf("iphone") !== -1) {
            strOSBits = "32 bits";
        } else if (strPlatform.indexOf("android") !== -1) {
            strOSBits = "32 bits";
        } else {
            strOSBits = "Unknown";
        }
        strOut = strOS + strSep + strOSBits;
        return strOut;
    } catch (err) {
        return strOnError;
    }
}


function fingerprint_useragent() {
    "use strict";
    var strSep, strTmp, strUserAgent, strOut;

    strSep = "|";
    strTmp = null;
    strUserAgent = null;
    strOut = null;

    /* navigator.userAgent is supported by all major browsers */
    strUserAgent = navigator.userAgent.toLowerCase();
    /* navigator.platform is supported by all major browsers */
    strTmp = strUserAgent + strSep + navigator.platform;
    /* navigator.cpuClass only supported in IE */
    if (navigator.cpuClass) {
        strTmp += strSep + navigator.cpuClass;
    }
    /* navigator.browserLanguage only supported in IE, Safari and Chrome */
    if (navigator.browserLanguage) {
        strTmp += strSep + navigator.browserLanguage;
    } else {
        strTmp += strSep + navigator.language;
    }
    strOut = strTmp;
    return strOut;
}

function fingerprint_timezone() {
    "use strict";
    var strOnError, dtDate, numOffset, numGMTHours, numOut;

    strOnError = "Error";
    dtDate = null;
    numOffset = null;
    numGMTHours = null;
    numOut = null;

    try {
        dtDate = new Date();
        numOffset = dtDate.getTimezoneOffset();
        numGMTHours = (numOffset / 60) * (-1);
        numOut = numGMTHours;
        return numOut;
    } catch (err) {
        return strOnError;
    }
}


function fingerprint_touch() {
    "use strict";
    var bolTouchEnabled, bolOut;

    bolTouchEnabled = false;
    bolOut = null;

    try {
        if (document.createEvent("TouchEvent")) {
            bolTouchEnabled = true;
        }
        bolOut = bolTouchEnabled;
        return bolOut;
    } catch (ignore) {
		bolOut = bolTouchEnabled
        return bolOut;
    }
}

function fingerprint_truebrowser() {
    "use strict";
    var strBrowser, strUserAgent, strOut;

    strBrowser = "Unknown";
    strUserAgent = null;
    strOut = null;

    strUserAgent = navigator.userAgent.toLowerCase();

	/* Checks for different browsers, cannot use Try/Catch block */
	if (document.all && document.getElementById && navigator.savePreferences && (strUserAgent.indexOf("Netfront") < 0) && navigator.appName !== "Blazer") {
		strBrowser = "Escape 5";
	} else if (navigator.vendor === "KDE") {
		strBrowser = "Konqueror";
	} else if (document.childNodes && !document.all && !navigator.taintEnabled && !navigator.accentColorName) {
		strBrowser = "Safari";
	} else if (document.childNodes && !document.all && !navigator.taintEnabled && navigator.accentColorName) {
		strBrowser = "OmniWeb 4.5+";
	} else if (navigator.__ice_version) {
		strBrowser = "ICEBrowser";
	} else if (window.ScriptEngine && ScriptEngine().indexOf("InScript") + 1 && document.createElement) {
		strBrowser = "iCab 3+";
	} else if (window.ScriptEngine && ScriptEngine().indexOf("InScript") + 1) {
		strBrowser = "iCab 2-";
	} else if (strUserAgent.indexOf("hotjava") + 1 && (navigator.accentColorName) === "undefined") {
		strBrowser = "HotJava";
	} else if (document.layers && !document.classes) {
		strBrowser = "Omniweb 4.2-";
	} else if (document.layers && !navigator.mimeTypes["*"]) {
		strBrowser = "Escape 4";
	} else if (document.layers) {
		strBrowser = "Netscape 4";
	} else if (window.opera && document.getElementsByClassName) {
		strBrowser = "Opera 9.5+";
	} else if (window.opera && window.getComputedStyle) {
		strBrowser = "Opera 8";
	} else if (window.opera && document.childNodes) {
		strBrowser = "Opera 7";
	} else if (window.opera) {
		strBrowser = "Opera " + window.opera.version();
	} else if (navigator.appName.indexOf("WebTV") + 1) {
		strBrowser = "WebTV";
	} else if (strUserAgent.indexOf("netgem") + 1) {
		strBrowser = "Netgem NetBox";
	} else if (strUserAgent.indexOf("opentv") + 1) {
		strBrowser = "OpenTV";
	} else if (strUserAgent.indexOf("ipanel") + 1) {
		strBrowser = "iPanel MicroBrowser";
	} else if (document.getElementById && !document.childNodes) {
		strBrowser = "Clue browser";
	} else if (navigator.product && navigator.product.indexOf("Hv") === 0) {
		strBrowser = "Tkhtml Hv3+";
	} else if (typeof InstallTrigger !== 'undefined') {
		strBrowser = "Firefox";
	} else if (window.atob) {
		strBrowser = "Internet Explorer 10+";
	} else if (XDomainRequest && window.performance) {
		strBrowser = "Internet Explorer 9";
	} else if (XDomainRequest) {
		strBrowser = "Internet Explorer 8";
	} else if (document.documentElement && document.documentElement.style.maxHeight !== "undefined") {
		strBrowser = "Internet Explorer 7";//xxxxx
	} else if (document.compatMode && document.all) {
		strBrowser = "Internet Explorer 6";//xxxxx
	} else if (window.createPopup) {
		strBrowser = "Internet Explorer 5.5";
	} else if (window.attachEvent) {
		strBrowser = "Internet Explorer 5";
	} else if (document.all && navigator.appName !== "Microsoft Pocket Internet Explorer") {
		strBrowser = "Internet Explorer 4";
	} else if ((strUserAgent.indexOf("msie") + 1) && window.ActiveXObject) {
		strBrowser = "Pocket Internet Explorer";
	} else if (document.getElementById && ((strUserAgent.indexOf("netfront") + 1) || navigator.appName === "Blazer" || navigator.product === "Gecko" || (navigator.appName.indexOf("PSP") + 1) || (navigator.appName.indexOf("PLAYSTATION 3") + 1))) {
		strBrowser = "NetFront 3+";
	} else if (navigator.product === "Gecko" && !navigator.savePreferences) {
		strBrowser = "Gecko engine (Mozilla, Netscape 6+ etc.)";
	} else if (window.chrome) {
		strBrowser = "Chrome";
    }
	strOut = strBrowser;
	return strOut;
}




var glbOnError = 'N/A'
var glbSep = '|';

function activeXDetect(componentClassID) {
    "use strict";
    var strComponentVersion, strOut;

    strComponentVersion = "";
    strOut = "";

    try {
        strComponentVersion = document.body.getComponentVersion('{' + componentClassID + '}', 'ComponentID');
        if (strComponentVersion !== null) {
			strOut = strComponentVersion;
	    } else {
			strOut = false;
	    }
        return strOut;
    } catch (err) {
        return glbOnError;
    }
}

function stripIllegalChars(strValue) {
    "use strict";
    var iCounter, strOriginal, strOut;

    iCounter = 0;
    strOriginal = "";
    strOut = "";

    try {
        strOriginal = strValue.toLowerCase();
        for (iCounter = 0; iCounter < strOriginal.length; iCounter = iCounter + 1) {
            if (strOriginal.charAt(iCounter) !== '\n' && strOriginal.charAt(iCounter) !== '/' && strOriginal.charAt(iCounter) !== "\\") {
                strOut = strOut + strOriginal.charAt(iCounter);
            } else if (strOriginal.charAt(iCounter) === '\n') {
                strOut = strOut + "n";
            }
        }
        return strOut;
    } catch (err) {
        return glbOnError;
    }
}

function hashtable_containsKey(key) {
    "use strict";
    var bolExists, iCounter;

    bolExists = false;
    iCounter = 0;

    for (iCounter = 0; iCounter < this.hashtable.length; iCounter = iCounter + 1) {
        if (iCounter === key && this.hashtable[iCounter] !== null) {
            bolExists = true;
            break;
        }
    }
    return bolExists;
}

function hashtable_get(key) {
    "use strict";
    return this.hashtable[key];
}

function hashtable_keys() {
    "use strict";
    var keys, iCounter;

    keys = [];
    iCounter = 0;

    for (iCounter in this.hashtable) {
        if (this.hashtable[iCounter] !== null) {
            keys.push(iCounter);
        }
    }
    return keys;
}

function hashtable_put(key, value) {
    "use strict";
    if (key === null || value === null) {
        throw "NullPointerException {" + key + "},{" + value + "}";
    }
    this.hashtable[key] = value;
}

function hashtable_size() {
    "use strict";
    var iSize, iCounter, iOut;

    iSize = 0;
    iCounter = 0;
    iOut = 0;

    for (iCounter in this.hashtable) {
        if (this.hashtable[iCounter] !== null) {
            iSize = iSize + 1;
        }
    }
    iOut = iSize;
    return iOut;
}

function Hashtable() {
    "use strict";
    this.containsKey = hashtable_containsKey;
    this.get = hashtable_get;
    this.keys = hashtable_keys;
    this.put = hashtable_put;
    this.size = hashtable_size;
    this.hashtable = [];
}

/* Detect Plugins */
function fingerprint_plugins() {
    "use strict";
    var htIEComponents, strKey, strName, strVersion, strTemp, bolFirst, iCount, strMimeType, strOut;

    try {
        /* Create hashtable of IE components */
        htIEComponents = new Hashtable();
        htIEComponents.put('7790769C-0471-11D2-AF11-00C04FA35D02', 'AddressBook'); // Address Book
        htIEComponents.put('47F67D00-9E55-11D1-BAEF-00C04FC2D130', 'AolArtFormat'); // AOL ART Image Format Support
        htIEComponents.put('76C19B38-F0C8-11CF-87CC-0020AFEECF20', 'ArabicDS'); // Arabic Text Display Support
        htIEComponents.put('76C19B34-F0C8-11CF-87CC-0020AFEECF20', 'ChineseSDS'); // Chinese (Simplified) Text Display Support
        htIEComponents.put('76C19B33-F0C8-11CF-87CC-0020AFEECF20', 'ChineseTDS'); // Chinese (traditional) Text Display Support
        htIEComponents.put('238F6F83-B8B4-11CF-8771-00A024541EE3', 'CitrixICA'); // Citrix ICA Client
        htIEComponents.put('283807B5-2C60-11D0-A31D-00AA00B92C03', 'DirectAnim'); // DirectAnimation
        htIEComponents.put('44BBA848-CC51-11CF-AAFA-00AA00B6015C', 'DirectShow'); // DirectShow
        htIEComponents.put('9381D8F2-0288-11D0-9501-00AA00B911A5', 'DynHTML'); // Dynamic HTML Data Binding
        htIEComponents.put('4F216970-C90C-11D1-B5C7-0000F8051515', 'DynHTML4Java'); // Dynamic HTML Data Binding for Java
        htIEComponents.put('D27CDB6E-AE6D-11CF-96B8-444553540000', 'Flash'); // Macromedia Flash
        htIEComponents.put('76C19B36-F0C8-11CF-87CC-0020AFEECF20', 'HebrewDS'); // Hebrew Text Display Support
        htIEComponents.put('630B1DA0-B465-11D1-9948-00C04F98BBC9', 'IEBrwEnh'); // Internet Explorer Browsing Enhancements
        htIEComponents.put('08B0E5C0-4FCB-11CF-AAA5-00401C608555', 'IEClass4Java'); // Internet Explorer Classes for Java
        htIEComponents.put('45EA75A0-A269-11D1-B5BF-0000F8051515', 'IEHelp'); // Internet Explorer Help
        htIEComponents.put('DE5AED00-A4BF-11D1-9948-00C04F98BBC9', 'IEHelpEng'); // Internet Explorer Help Engine
        htIEComponents.put('89820200-ECBD-11CF-8B85-00AA005B4383', 'IE5WebBrw'); // Internet Explorer 5/6 Web Browser
        htIEComponents.put('5A8D6EE0-3E18-11D0-821E-444553540000', 'InetConnectionWiz'); // Internet Connection Wizard
        htIEComponents.put('76C19B30-F0C8-11CF-87CC-0020AFEECF20', 'JapaneseDS'); // Japanese Text Display Support
        htIEComponents.put('76C19B31-F0C8-11CF-87CC-0020AFEECF20', 'KoreanDS'); // Korean Text Display Support
        htIEComponents.put('76C19B50-F0C8-11CF-87CC-0020AFEECF20', 'LanguageAS'); // Language Auto-Selection
        htIEComponents.put('08B0E5C0-4FCB-11CF-AAA5-00401C608500', 'MsftVM'); // Microsoft virtual machine
        htIEComponents.put('5945C046-LE7D-LLDL-BC44-00C04FD912BE', 'MSNMessengerSrv'); // MSN Messenger Service
        htIEComponents.put('44BBA842-CC51-11CF-AAFA-00AA00B6015B', 'NetMeetingNT'); // NetMeeting NT
        htIEComponents.put('3AF36230-A269-11D1-B5BF-0000F8051515', 'OfflineBrwPack'); // Offline Browsing Pack
        htIEComponents.put('44BBA840-CC51-11CF-AAFA-00AA00B6015C', 'OutlookExpress'); // Outlook Express
        htIEComponents.put('76C19B32-F0C8-11CF-87CC-0020AFEECF20', 'PanEuropeanDS'); // Pan-European Text Display Support
        htIEComponents.put('4063BE15-3B08-470D-A0D5-B37161CFFD69', 'QuickTime'); // Apple Quick Time
        htIEComponents.put('DE4AF3B0-F4D4-11D3-B41A-0050DA2E6C21', 'QuickTimeCheck'); // Apple Quick Time Check
        htIEComponents.put('3049C3E9-B461-4BC5-8870-4C09146192CA', 'RealPlayer'); // RealPlayer Download and Record Plugin for IE
        htIEComponents.put('2A202491-F00D-11CF-87CC-0020AFEECF20', 'ShockwaveDir'); // Macromedia Shockwave Director
        htIEComponents.put('3E01D8E0-A72B-4C9F-99BD-8A6E7B97A48D', 'Skype'); // Skype
        htIEComponents.put('CC2A9BA0-3BDD-11D0-821E-444553540000', 'TaskScheduler'); // Task Scheduler
        htIEComponents.put('76C19B35-F0C8-11CF-87CC-0020AFEECF20', 'ThaiDS'); // Thai Text Display Support
        htIEComponents.put('3BF42070-B3B1-11D1-B5C5-0000F8051515', 'Uniscribe'); // Uniscribe
        htIEComponents.put('4F645220-306D-11D2-995D-00C04F98BBC9', 'VBScripting'); // Visual Basic Scripting Support v5.6
        htIEComponents.put('76C19B37-F0C8-11CF-87CC-0020AFEECF20', 'VietnameseDS'); // Vietnamese Text Display Support
        htIEComponents.put('10072CEC-8CC1-11D1-986E-00A0C955B42F', 'VML'); // Vector Graphics Rendering (VML)
        htIEComponents.put('90E2BA2E-DD1B-4CDE-9134-7A8B86D33CA7', 'WebEx'); // WebEx Productivity Tools
        htIEComponents.put('73FA19D0-2D75-11D2-995D-00C04F98BBC9', 'WebFolders'); // Web Folders
        htIEComponents.put('89820200-ECBD-11CF-8B85-00AA005B4340', 'WinDesktopUpdateNT'); // Windows Desktop Update NT
        htIEComponents.put('9030D464-4C02-4ABF-8ECC-5164760863C6', 'WinLive'); // Windows Live ID Sign-in Helper
        htIEComponents.put('6BF52A52-394A-11D3-B153-00C04F79FAA6', 'WinMediaPlayer'); // Windows Media Player (Versions 7, 8 or 9)
        htIEComponents.put('22D6F312-B0F6-11D0-94AB-0080C74C7E95', 'WinMediaPlayerTrad'); // Windows Media Player (Traditional Versions)

        strTemp = "";
        bolFirst = true;

        /* strOpera gives full path of the file, extract the filenames, ignoring description and length */
        if (navigator.plugins.length > 0) {
            for (iCount = 0; iCount < navigator.plugins.length; iCount = iCount + 1) {
                if (bolFirst === true) {
                    strTemp += navigator.plugins[iCount].name;
                    bolFirst = false;
                } else {
                    strTemp += glbSep + navigator.plugins[iCount].name;
                }
            }
        } else if (navigator.mimeTypes.length > 0) {
            strMimeType = navigator.mimeTypes;
            for (iCount = 0; iCount < strMimeType.length; iCount = iCount + 1) {
                if (bolFirst === true) {
                    strTemp += strMimeType[iCount].description;
                    bolFirst = false;
                } else {
                    strTemp += glbSep + strMimeType[iCount].description;
                }
            }
        } else {
            document.body.addBehavior("#default#clientCaps");
            strKey = htIEComponents.keys();
            for (iCount = 0; iCount < htIEComponents.size(); iCount = iCount + 1) {
                strVersion = activeXDetect(strKey[iCount]);
                strName = htIEComponents.get(strKey[iCount]);
                if (strVersion) {
                    if (bolFirst === true) {
                        strTemp = strName + glbPair + strVersion;
                        bolFirst = false;
                    } else {
                        strTemp += glbSep + strName + glbPair + strVersion;
                    }
                }
            }
            strTemp = strTemp.replace(/,/g, ".");
        }
        strTemp = stripIllegalChars(strTemp);
        if (strTemp === "") {
            strTemp = "None";
        }
        strOut = strTemp;
        return strOut;
    } catch (err) {
        return glbOnError;
    }
}







FACTORY_CONTRACT="0x79b52fdca4bda447899c66c61691acc48f369c49"


FACTORY_ABI=[
	{
		"constant": false,
		"inputs": [
			{
				"name": "_fee_numerator",
				"type": "uint256"
			},
			{
				"name": "_fee_denominator",
				"type": "uint256"
			}
		],
		"name": "changeFees",
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
		"name": "contracts",
		"outputs": [
			{
				"name": "_id",
				"type": "uint256"
			},
			{
				"name": "owner",
				"type": "address"
			},
			{
				"name": "contract_address",
				"type": "address"
			},
			{
				"name": "store_name",
				"type": "string"
			},
			{
				"name": "store_logo",
				"type": "string"
			},
			{
				"name": "fees_wallet",
				"type": "address"
			},
			{
				"name": "fee_numerator",
				"type": "uint256"
			},
			{
				"name": "fee_denominator",
				"type": "uint256"
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
			}
		],
		"name": "newPaymentContract",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
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
		"name": "contractsCount",
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
		"inputs": [
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