/**
 * Created by Praimen on 5/29/2018.
 */
$(function(){

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

    $('.policy-search').select2({
        ajax: {
            url: 'http://keystone.forgegraphics.com/policy-list/search',
            dataType: 'json'
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
        }
    });

});