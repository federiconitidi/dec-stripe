//-----------------------------------------------------------------------------
// Setup
//-----------------------------------------------------------------------------


$(document).ready(function () {
    console.log( "ready!" );
    // Get the user_id and store it into sessionStorage
    $.ajax({
        url :'api/v1/session/user_id',
        type : 'GET',
        data : ''
        }).done(function(data) {
            sessionStorage['user_id']=data.user_id
            console.log( sessionStorage['user_id'] );
        });
    apiPage()
});


// Save the api name during the Api editing process
function updateApiName(user_input){
    $.ajax({
        url :'api/v1/apis/update/name_tag',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id'], name_tag : user_input.value},
        }).done(function(data) {
            sessionStorage['current_api_id']=data['_id']
            sessionStorage['current_api_name_tag']=data['name_tag']
            sessionStorage['current_api_api_root']=data['api_root']
        });
}

// Save the api name during the Api editing process
function updateApiRoot(user_input){
    $.ajax({
        url :'api/v1/apis/update/api_root',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id'], api_root : user_input.value},
        }).done(function(data) {
            sessionStorage['current_api_id']=data['_id']
            sessionStorage['current_api_name_tag']=data['name_tag']
            sessionStorage['current_api_api_root']=data['api_root']
        });
}

// Temporarily save the name_tag of a new input data
function updateModalInputName(user_input){
    sessionStorage['input_name_tag']=user_input.value
}

// Temporarily save the type of a new input data
function updateModalInputType(user_input){
    sessionStorage['input_data_type']=user_input.getAttribute("data-type")
}

// Temporarily save the mandatory attribute of a new input data
function updateModalInputMandatory(user_input){
    sessionStorage['input_mandatory']=user_input.getAttribute("data-mandatory")
}

// Temporarily save the task name
function updateModalTaskName(user_input){
    sessionStorage['task_name_tag']=user_input.value
}

// Temporarily switch on/off the input selected to be used for the Task
function updateModalTaskAddInput(user_input){
    sessionStorage['task_input_list']=user_input.getAttribute("task_id")+"_"+user_input.value
}

// Temporarily save the task instruction title
function updateModalTaskInstructionTitle(user_input){
    sessionStorage['task_instruction_title']=user_input.value
}

// Temporarily save the task instruction title
function updateModalTaskInstructionDescription(user_input){
    sessionStorage['task_instruction_description']=user_input.value
}

// Temporarily save the output_type attribute of the task
function updateModalTaskOutputType(user_input){
    sessionStorage['task_output_type']=user_input.getAttribute("data-output_type")
}

// Temporarily save the task output label
function updateModalTaskOutputLabel(user_input){
    sessionStorage['task_output_label']=user_input.value
}


// Call the backend to create a new input
function create_new_input() {
    $.ajax({
        url :'api/v1/input_data/create',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id'], name_tag : sessionStorage['input_name_tag'], data_type : sessionStorage['input_data_type'], mandatory : sessionStorage['input_mandatory']},
        }).done(function(data) {
            load_inputs()
        });
}


// Call the backend to create a new task
function create_new_task() {
    $.ajax({
        url :'api/v1/tasks/create',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id'], name_tag : sessionStorage['task_name_tag'], input_list : sessionStorage['task_input_list'], record_validity : sessionStorage['task_record_validity'], instruction_title: sessionStorage['task_instruction_title'], instruction_description: sessionStorage['task_instruction_description'], output_type: sessionStorage['task_output_type'], output_label: sessionStorage['task_output_label']},
        }).done(function(data) {
            load_tasks()
        });
}



// Call the backend to update an existing input
function update_input_data(data) {
    input_data_id=data.getAttribute("input_data_id")
    $.ajax({
        url :'api/v1/input_data/update',
        type : 'GET',
        data : { input_data_id : input_data_id, name_tag : sessionStorage['input_name_tag'], data_type : sessionStorage['input_data_type'], mandatory : sessionStorage['input_mandatory']},
        }).done(function(data) {
            load_inputs()
        });
}

// Call the backend to delete an existing input
function delete_input(data) {
    input_data_id=data.getAttribute("input_id")
    $.ajax({
        url :'api/v1/input_data/delete',
        type : 'GET',
        data : { input_data_id : input_data_id},
        }).done(function(data) {
            load_inputs()
        });
}

// Call the backend to delete an existing task
function delete_task(data) {
    task_id=data.getAttribute("task_id")
    $.ajax({
        url :'api/v1/tasks/delete',
        type : 'GET',
        data : { task_id : task_id},
        }).done(function(data) {
            load_tasks()
        });
}

function apiPage() {
    // load up all the APIs
    $.ajax({
        url :'api/v1/apis/all',
        type : 'GET',
        data : { user_id : sessionStorage['user_id']},
        }).done(function(data) {
            if (data.length==0) {
                apiPageNoData();
            } else{
                apiPageWithData(data);
            }
        });
}


function apiPageNoData() {
    document.getElementById("page_container").innerHTML = ''
    var parent = document.getElementById("page_container")
    var page = document.getElementById("page_main_container_element").innerHTML
    page = page.replace(/{page_title}/g, "My APIs")
    page = page.replace(/{page_content_layout}/g, document.getElementById("page_content_layout_two_columns_element").innerHTML)
    page = page.replace(/{large_column_content}/g, document.getElementById("first_api_creation_no_data_element").innerHTML)
    page = page.replace(/{small_column_content}/g, document.getElementById("first_api_creation_helper_element").innerHTML)
    $(page).appendTo(parent);
}


function apiPageWithData(data) {
    document.getElementById("page_container").innerHTML = ''
    var parent = document.getElementById("page_container")
    var page = document.getElementById("page_main_container_element").innerHTML
    page = page.replace(/{page_title}/g, "My APIs")
    page = page.replace(/{page_content_layout}/g, document.getElementById("page_content_layout_two_columns_element").innerHTML)
    
    // Build the horizontal cards for the exiting APIs
    var cards=''
    for (i = 0, len = data.length; i < len; i++) {
        cards = cards+ document.getElementById("horizontal_api_bar_element").innerHTML.replace(/{name_tag}/g, data[i]['name_tag']).replace(/{api_id}/g, data[i]['_id']).replace(/{api_id}/g, data[i]['_id']).replace(/{api_id}/g, data[i]['_id'])
    }
    page = page.replace(/{large_column_content}/g, cards)
    page = page.replace(/{small_column_content}/g, document.getElementById("api_page_helper_element").innerHTML)
    $(page).appendTo(parent);
}

// Call the backend to create a new api
function create_new_api() {
    $.ajax({
        url :'api/v1/apis/create',
        type : 'GET',
        data : { user_id : sessionStorage['user_id']},
        }).done(function(data) {
            sessionStorage['current_api_id']=data['_id']
            sessionStorage['current_api_name_tag']=data['name_tag']
            sessionStorage['current_api_api_root']=data['api_root']
            load_editor_step_one(data)
        });
}

// Call the backend to edit an existing api
function edit_api(user_input) {
    $.ajax({
        url :'api/v1/apis/load',
        type : 'GET',
        data : { api_id : user_input.getAttribute("api_id")},
        }).done(function(data) {
            sessionStorage['current_api_id']=data['_id']
            sessionStorage['current_api_name_tag']=data['name_tag']
            sessionStorage['current_api_api_root']=data['api_root']
            load_editor_step_one(data)
        });
}


// Call the backend to edit the current api
function edit_current_api() {
    $.ajax({
        url :'api/v1/apis/load',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id']},
        }).done(function(data) {
            sessionStorage['current_api_id']=data['_id']
            sessionStorage['current_api_name_tag']=data['name_tag']
            sessionStorage['current_api_api_root']=data['api_root']
            load_editor_step_one(data)
        });
}


// Call the backend to delete an existing api
function delete_api(user_input) {
    $.ajax({
        url :'api/v1/apis/delete',
        type : 'GET',
        data : { api_id : user_input.getAttribute("api_id")},
        }).done(function(data) {
            sessionStorage['current_api_id']=''
            sessionStorage['current_api_name_tag']=''
            sessionStorage['current_api_api_root']=''
            apiPage()
        });
}


// Call the backend to edit an existing input_data
function edit_input(user_input) {
    $.ajax({
        url :'api/v1/input_data/load',
        type : 'GET',
        data : { input_data_id : user_input.getAttribute("input_id")},
        }).done(function(data) {
            sessionStorage['input_name_tag']=data['name_tag']
            sessionStorage['input_data_type']=data['data_type']
            sessionStorage['input_mandatory']=data['mandatory']

            if (data['data_type']=='string'){
                var string_checkbox='checked'
                var number_checkbox=''
            } else {
                var string_checkbox=''
                var number_checkbox='checked'
            }
            if (data['mandatory']=='yes'){
                var mandatory_checkbox='checked'
                var optional_checkbox=''
            } else {
                var mandatory_checkbox=''
                var optional_checkbox='checked'
            }
            document.getElementById("new_input_data").innerHTML = document.getElementById("new_input_data_modal").innerHTML.replace(/{input_name_value}/g, 'value="'+data['name_tag']+'"').replace(/{string_checkbox}/g, string_checkbox).replace(/{number_checkbox}/g, number_checkbox).replace(/{mandatory_checkbox}/g, mandatory_checkbox).replace(/{optional_checkbox}/g, optional_checkbox).replace(/{function}/g, 'update_input_data(this)').replace(/{input_id}/g, data['_id'])
            $(new_input_data).modal('show');
        });
}


// Prepare the modal panel to insert a new input
function new_input() {
            sessionStorage['input_name_tag']='New input'
            sessionStorage['input_data_type']='string'
            sessionStorage['input_mandatory']='yes'
            document.getElementById("new_input_data").innerHTML = document.getElementById("new_input_data_modal").innerHTML.replace(/{input_name_value}/g, 'placeholder="E.g. my_new_input"').replace(/{string_checkbox}/g, 'checked').replace(/{number_checkbox}/g, '').replace(/{mandatory_checkbox}/g, 'checked').replace(/{optional_checkbox}/g, '').replace(/{function}/g, 'create_new_input()').replace(/{input_id}/g, '')
            $(new_input_data).modal('show');
}

// Prepare the modal panel to insert a new input
function new_task() {
    // load up all the existing tasks for the current Api
    $.ajax({
        url :'api/v1/tasks/all',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id']},
        }).done(function(data) {
            // compose the list of inputs to select for the new task
            var input_list = document.getElementById("input_for_task_element").innerHTML.replace(/{input_to_task}/g, 'Original input to the API').replace(/{task_id}/g, 'original')
            for (i = 0, len = data.length; i < len; i++) {
                input_list = input_list+ document.getElementById("input_for_task_element").innerHTML.replace(/{input_to_task}/g, 'Output of task <i>"'+data[i]['name_tag']+'"</i>').replace(/{task_id}/g, data[i]['_id'])
            }
            sessionStorage['task_name_tag']='New task'
            sessionStorage['task_input_list']=''
            sessionStorage['task_record_validity']=''
            sessionStorage['task_instruction_title']=''
            sessionStorage['task_instruction_description']=''
            sessionStorage['task_output_type']='multiple_choice'
            sessionStorage['task_output_label']=''
            sessionStorage['task_record_validity']=''

            document.getElementById("new_task_window").innerHTML = document.getElementById("new_task_modal").innerHTML.replace(/{task_name_value}/g, 'placeholder="E.g. my_new_task"').replace(/{list_of_inputs}/g, input_list).replace(/{task_instruction_title}/g, 'placeholder="E.g. Please do xyz"').replace(/{task_instruction_description}/g, 'placeholder="E.g. Please take the input provided and do xyz"').replace(/{multiple_choice_checkbox}/g, 'checked').replace(/{text_checkbox}/g, '').replace(/{task_output_label}/g, 'placeholder="Yes&#10;No"').replace(/{function}/g, 'create_new_task()').replace(/{task_id}/g, '')
            $(new_task_window).modal('show');

        });
}



// Build the first page of the api building process
function load_editor_step_one(api) {    
    // Create the first page of the Api creation process
    document.getElementById("page_container").innerHTML = ''
    var parent = document.getElementById("page_container")
    var page = document.getElementById("page_main_container_element").innerHTML
    page = page.replace(/{page_title}/g, "Create new API")
    page = page.replace(/{page_content_layout}/g, document.getElementById("page_content_layout_two_columns_element").innerHTML)

    // Re-include in the form the api_name if it has already been filled, otherwise show a placeholder
    if (api['name_tag']!=''){
        api_name_value = 'value="'+ api['name_tag'] +'"'
    } else {
        api_name_value = 'placeholder="E.g. My fantastic API"'
    }
    // Re-include in the form the api_root if it has already been filled, otherwise show a placeholder
    if (api['api_root']!=''){
        api_root_value = 'value="'+ api['api_root'] +'"'
    } else {
        api_root_value = 'placeholder="E.g. fantastic_api"'
    }
    page = page.replace(/{large_column_content}/g, document.getElementById("api_creation_step_one_element").innerHTML.replace(/{api_name_value}/g, api_name_value).replace(/{api_root_value}/g, api_root_value))
    page = page.replace(/{small_column_content}/g, document.getElementById("api_creation_step_one_helper_element").innerHTML)
    $(page).appendTo(parent);
}



function load_inputs() {
    // load up all the inputs for the current Api
    $.ajax({
        url :'api/v1/input_data/all',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id']},
        }).done(function(data) {
            load_editor_step_two(data)
        });
}



function load_editor_step_two(input_data) {
    document.getElementById("page_container").innerHTML = ''
    var parent = document.getElementById("page_container")
    var page = document.getElementById("page_main_container_element").innerHTML
    page = page.replace(/{page_title}/g, "Create new API")
    page = page.replace(/{page_content_layout}/g, document.getElementById("page_content_layout_two_columns_element").innerHTML)
    // Build the horizontal cards for the exiting Input data
    var cards=''
    for (i = 0, len = input_data.length; i < len; i++) {
        cards = cards+ document.getElementById("horizontal_input_data_bar_element").innerHTML.replace(/{name_tag}/g, input_data[i]['name_tag']).replace(/{data_type}/g, input_data[i]['data_type']).replace(/{mandatory}/g, input_data[i]['mandatory']).replace(/{input_id}/g, input_data[i]['_id']).replace(/{input_id}/g, input_data[i]['_id'])
    }
    console.log(  input_data.length );
    page = page.replace(/{large_column_content}/g, document.getElementById("api_creation_step_two_element").innerHTML.replace(/{existing_input_data}/g, cards))
    page = page.replace(/{small_column_content}/g, document.getElementById("api_creation_step_two_helper_element").innerHTML)
    $(page).appendTo(parent);
}


function load_tasks() {
    // load up all the inputs for the current Api
    $.ajax({
        url :'api/v1/tasks/all',
        type : 'GET',
        data : { api_id : sessionStorage['current_api_id']},
        }).done(function(data) {
            load_editor_step_three(data)
        });
}


function load_editor_step_three(tasks) {
    document.getElementById("page_container").innerHTML = ''
    var parent = document.getElementById("page_container")
    var page = document.getElementById("page_main_container_element").innerHTML
    page = page.replace(/{page_title}/g, "Create new API")
    page = page.replace(/{page_content_layout}/g, document.getElementById("page_content_layout_two_columns_element").innerHTML)
    // Build the horizontal cards for the exiting Task data
    var cards=''
    for (i = 0, len = tasks.length; i < len; i++) {
        cards = cards+ document.getElementById("horizontal_task_bar_element").innerHTML.replace(/{name_tag}/g, tasks[i]['name_tag']).replace(/{task_id}/g, tasks[i]['_id']).replace(/{task_id}/g, tasks[i]['_id'])
    }
    page = page.replace(/{large_column_content}/g, document.getElementById("api_creation_step_three_element").innerHTML).replace(/{existing_tasks}/g, cards)
    page = page.replace(/{small_column_content}/g, document.getElementById("api_creation_step_three_helper_element").innerHTML)
    $(page).appendTo(parent);
}

function createApiStep4() {
    document.getElementById("page_container").innerHTML = ''
    var parent = document.getElementById("page_container")
    var page = document.getElementById("page_main_container_element").innerHTML
    page = page.replace(/{page_title}/g, "Create new API")
    page = page.replace(/{page_content_layout}/g, document.getElementById("page_content_layout_two_columns_element").innerHTML)
    page = page.replace(/{large_column_content}/g, document.getElementById("api_creation_step_four_element").innerHTML)
    page = page.replace(/{small_column_content}/g, document.getElementById("api_creation_step_four_helper_element").innerHTML)
    $(page).appendTo(parent);
}

