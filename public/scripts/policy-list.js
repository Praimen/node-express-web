/**
 * Created by Praimen on 5/29/2018.
 */
$(function(){

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

    $('select.policy-search').select2({
        theme: "classic",
        ajax: {
            url: 'http://keystone.forgegraphics.com/policy-list/search',
            dataType: 'json'
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
        }
    });

});