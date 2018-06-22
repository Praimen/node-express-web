/**
 * Created by Praimen on 5/29/2018.
 */
$(function(){


    var policyQueryString = {
        final:'?final=true',
        draft:'?draft=true'
    };


    var policyURL = {
        search: 'https://keystone.forgegraphics.com/policy-list/search',
        policylist: 'https://keystone.forgegraphics.com/policy-list',
    };
    var policyListSearchURL = policyURL.search + policyQueryString.final,
        policyListStaticURL = policyURL.policylist + policyQueryString.final;

    function loadPolicyList(policyTypeQueryString){
        $.ajax({
            url: policyURL.policylist + policyTypeQueryString
        }).done(function(data){
            let queryString = policyTypeQueryString;
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
            $(this).addClass('is-active')
            policyListSearchURL = policyURL.search + policyQueryString.draft;
            loadPolicyList(policyQueryString.draft)
        }else{
            $(this).addClass('is-active');
            policyListSearchURL = policyURL.search + policyQueryString.final;
            loadPolicyList(policyQueryString.final)
        }

    })


    $('select.policy-search').select2({
        containerCssClass:'column is-6 select2-element',

        minimumInputLength: 2,
        dropdownAutoWidth:true,
        dropdownCssClass:'select2-dropdown-element',

        dropdownParent:$('.policy-search'),
        ajax: {
            delay: 250,
            url: function(){
                return policyListSearchURL
            },
            dataType: 'json'
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
        }
    });

    $('select.policy-search').on('select2:select', function (e) {
        let data = e.params.data;
        console.log(data);
        if($('.policy-tabs li.final-tab').hasClass('is-active')){
            window.location = "/view-policy/"+data._id+policyQueryString.final
        }else if($('.policy-tabs li.draft-tab').hasClass('is-active')){
            window.location = "/view-policy/"+data._id+policyQueryString.draft
        }

    });

    loadPolicyList(policyQueryString.final)

});