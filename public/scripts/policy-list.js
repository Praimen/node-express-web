/**
 * Created by Praimen on 5/29/2018.
 */
$(function(){

    var policyType = 'final';
    var policyQueryString = {
        final:'?final=true',
        draft:'?draft=true'
    };
    var policyURL = {
        search: 'https://keystone.forgegraphics.com/policy-list/search',
        policylist: 'https://keystone.forgegraphics.com/policy-list',
    };
    var policyListSearchURL = policyURL.search + policyQueryString[policyType],
        policyListStaticURL = policyURL.policylist + policyQueryString[policyType];

    function loadPolicyList(){
        $.ajax({
            url: function(){ return policyListStaticURL}(),
        }).done(function(data){
            let queryString = policyQueryString[policyType];
            var policyListString ='';
            for (let i = 0; i < data.length; i++) {
                let obj = data[i];
                policyListString += '<li><a href="/view-policy/'+ obj._id + queryString+'">'+ obj._id +' - '+ obj.title +'</a></li>';
            }
            $('.policy-list ul').empty().append(policyListString);
        })
    }

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

    $('.policy-tabs li').on('click',function(){
        $('.policy-tabs li').removeClass('is-active');
        if($(this).hasClass('draft-tab')){
            policyType = 'draft';
            $(this).addClass('is-active')
        }else{
            policyType = 'final';
            $(this).addClass('is-active');
        }
        loadPolicyList()
    })


    $('select.policy-search').select2({
        minimumInputLength: 2,
        ajax: {
            delay: 250,
            url:function(){ return policyListSearchURL},
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

    loadPolicyList()

});