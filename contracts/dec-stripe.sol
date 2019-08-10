pragma solidity ^0.5.1;

contract Factory {
    address payable public fees_wallet;

    uint public contractsCount=0; 
    mapping(uint => PaymentContractRecord) public contracts;
    struct PaymentContractRecord {
        uint _id;
        address owner;
        address contract_address;
    }
    
    event newPaymentContractDeployed(
        address payable _owner
	);
	  
    // constructor
    constructor(address payable _fees_wallet) public {
        fees_wallet = _fees_wallet;
    }

    // deploy a new contract
    function newPaymentContract(address payable _owner) public returns(PaymentContract) {
        PaymentContract c = new PaymentContract( fees_wallet, _owner);
        contracts[contractsCount] = PaymentContractRecord(contractsCount, _owner, address(c));
        contractsCount ++;
        return c;
        emit newPaymentContractDeployed(_owner);
    }
}


contract PaymentContract {
    address payable public fees_wallet;
    address payable public owner;
    address payable public wallet;
    
    uint public productsCount = 0;
    mapping(uint => Product) public products;
    struct Product {
        uint _id;
        string name;
        string description;
        uint priceInWei;
        bool isactive;
        }
    
    uint public paymentsCount = 0;
    mapping(uint => Payment) public payments;
    struct Payment {
        uint _id;
        string customer_id;
        uint product_id;
        address sender;
    }
    
    modifier onlyOwner(){
        require(msg.sender == owner);
        _;
    }
    
    // at creation, assign to a specific owner
    // also, the output wallet is initially assigned to the owner address
    constructor(address payable _fees_wallet, address payable _owner) public {
        fees_wallet = _fees_wallet;
        owner = _owner;
        wallet = _owner;
    }
    
    // change the address of your output wallet
    function changeWallet(address payable _new_wallet) public onlyOwner {
        wallet = _new_wallet;
    }

    // create a product
    function createProduct(string memory _name, string memory _description, uint _price) public onlyOwner {
        products[productsCount] = Product(productsCount, _name, _description, _price, true);
        productsCount ++;
    }

    // remove a product
    function removeProduct(uint _id) public onlyOwner {
        products[_id].isactive = false;
    }

    // edit product 
    function editProduct(uint _id, string memory _name, string memory _description, uint _price ) public onlyOwner {
        products[_id].name = _name;
        products[_id].description = _description;
        products[_id].priceInWei = _price;
    }

    event PaymentCompleted(
        uint _id,
        string customer_id,
        uint product_id,
        address sender
	  );
	  
    // receive a payment 
    function pay(string memory _customer_id, uint _product_id) public payable {
        // proceed only if the payment refers to an active product
        require(products[_product_id].isactive == true);
        // proceed only if the transaction value is greater than the product price
        require(msg.value >= products[_product_id].priceInWei);
        
        // if amount received is higher than the price of the product, send back the difference
        if (msg.value > products[_product_id].priceInWei){
            msg.sender.transfer(msg.value - msg.value);
        }
        // transfer the money to the merchant wallet
        wallet.transfer((msg.value * 1)/2);
        // transfer the fees to the fees wallet
        fees_wallet.transfer((msg.value * 1)/2);
        // record the payment on the database
        payments[paymentsCount] = Payment(paymentsCount, _customer_id, _product_id, msg.sender);
        paymentsCount ++;
        emit PaymentCompleted(paymentsCount, _customer_id, _product_id, msg.sender);
    }


}