/**
 * Created by Praimen on 5/29/2018.
 */
$(function(){
    var policyListSearchURL = 'https://keystone.forgegraphics.com/policy-list/search';
    var policyType = 'final';
    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

    $('.policy-tabs li').on('click',function(){
        $('.policy-tabs li').removeClass('is-active');
        if($(this).hasClass('draft-tab')){
            policyType = 'draft';
            $(this).addClass('is-active')
            policyListSearchURL = 'https://keystone.forgegraphics.com/policy-list/search?draft=true';
        }else{
            policyType = 'final';
            $(this).addClass('is-active')
            policyListSearchURL = 'https://keystone.forgegraphics.com/policy-list/search';
        }

    })



    $('select.policy-search').select2({
        minimumInputLength: 2,
        ajax: {
            delay: 250,
            url: policyListSearchURL,
            dataType: 'json'
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
        }
    });

    $('select.policy-search').on('select2:select', function (e) {
        let data = e.params.data;
        console.log(data);
        if(policyType == 'final'){
            window.location = "/view-policy/"+data._id
        }else if(policyType == 'draft'){
            window.location = "/view-policy/"+data._id+'?draft'
        }

    });

});