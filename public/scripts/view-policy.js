/**
 * Created by Praimen on 5/25/2018.
 */
$(function(){

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

    $('button.edit-btn').on('click',function(){
        var URLArr = window.location.pathname.split('/');
        var policyNumber = URLArr[2];
        window.location = '/editor-test/'+policyNumber;

    })

});