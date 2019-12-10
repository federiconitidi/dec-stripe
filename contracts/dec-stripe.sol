pragma solidity ^0.5.1;

contract Factory {
    address payable public fees_wallet;
    uint public fee_numerator;
    uint public fee_denominator;

    uint public contractsCount=0; 
    mapping(uint => PaymentContractRecord) public contracts;
    struct PaymentContractRecord {
        uint _id;
        address owner;
        address contract_address;
        string store_name;
        string store_logo;
        address fees_wallet;
        uint fee_numerator;
        uint fee_denominator;
    }
    
    // constructor
    constructor(address payable _fees_wallet, uint _fee_numerator, uint _fee_denominator) public {
        fees_wallet = _fees_wallet;
        fee_numerator = _fee_numerator;
        fee_denominator = _fee_denominator;
    }

    // change the fees of the factory contract
    function changeFees(uint _fee_numerator, uint _fee_denominator) public {
        fee_numerator = _fee_numerator;
        fee_denominator = _fee_denominator;
    }


    // deploy a new contract
    function newPaymentContract(address payable _owner, string memory _store_name, string memory _store_logo) public returns(PaymentContract) {
        PaymentContract c = new PaymentContract(_owner, _store_name, _store_logo, fees_wallet, fee_numerator, fee_denominator);
        contracts[contractsCount] = PaymentContractRecord(contractsCount, _owner, address(c), _store_name, _store_logo, fees_wallet, fee_numerator, fee_denominator);
        contractsCount ++;
        return c;
    }
}


contract PaymentContract {
    address payable public fees_wallet;
    address payable public owner;
    address payable public wallet;
    string public store_name;
    string public store_logo;
    uint public fee_numerator;
    uint public fee_denominator;
    
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
        string product_name;
        uint price_paid;
        address sender;
        uint256 timestamp;
    }
    
    modifier onlyOwner(){
        require(msg.sender == owner);
        _;
    }
    
    // at creation, assign to a specific owner
    // also, the output wallet is initially assigned to the owner address
    constructor(address payable _owner, string memory _store_name, string memory _store_logo, address payable _fees_wallet, uint _fee_numerator, uint _fee_denominator) public {
        fees_wallet = _fees_wallet;
        owner = _owner;
        wallet = _owner;
        store_name = _store_name;
        store_logo = _store_logo;
        fee_numerator = _fee_numerator;
        fee_denominator = _fee_denominator;
    }
    
    // change the address of your output wallet
    function changeWallet(address payable _new_wallet) public onlyOwner {
        wallet = _new_wallet;
    }

    // change the payment contract name
    function changeName(string memory _new_store_name) public onlyOwner {
        store_name = _new_store_name;
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
        wallet.transfer((msg.value * (fee_denominator - fee_numerator))/fee_denominator);
        // transfer the fees to the fees wallet
        fees_wallet.transfer((msg.value * fee_numerator)/fee_denominator);
        // record the payment on the database
        payments[paymentsCount] = Payment(paymentsCount, _customer_id, _product_id, products[_product_id].name, products[_product_id].priceInWei, msg.sender, block.timestamp);
        paymentsCount ++;
    }


}