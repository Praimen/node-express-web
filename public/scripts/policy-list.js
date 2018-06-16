/**
 * Created by Praimen on 5/29/2018.
 */
$(function(){

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

    $('select.policy-search').select2({
        minimumInputLength: 3,
        ajax: {
            delay: 250,
            url: 'https://keystone.forgegraphics.com/policy-list/search',
            dataType: 'json'
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
        }
    });

    $('select.policy-search').on('select2:select', function (e) {
        let data = e.params.data;
        console.log(data);
        window.location = "/view-policy/"+data._id
    });

});