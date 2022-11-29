function getDocName(){
    let docName = "";
    let key = "id";
    let reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    let r = window.location.search.substr(1).match(reg);
    docName_t = decodeURI(r[2]);
    docName = docName_t.split('\'')[1];
    return docName;
}

function PageInit(){
    let filename = getDocName();
    $("#top").html(filename.split(".")[0]);
    $("title").html(filename.split(".")[0]);
    let uri = "./archive/"+filename;
    $.ajax({
        url: uri, 
        async: true, 
        success: function(res){
            $("#doc").html(res);
            $("#num").html("总字数:"+res.length.toString());
        }});
}

