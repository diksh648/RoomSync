package RoomSync.dsa;
import java.util.*;
/*public class dsa {
public static void main(String[] args) {*/

//TOPIC->>>>>>ARRAY
//problem 1 >>>>rotate an array by k times
/*int n;
int k;
Scanner sc=new Scanner(System.in);
    

k=sc.nextInt();
n=sc.nextInt();
int arr[]=new int[n];
for(int i=0;i<n;i++){
    arr[i]=sc.nextInt();
}
int r;
for(r=0;r<k;r++){
int last =arr[n-1];
for(int i=n-1;i>0;i--){
    arr[i]=arr[i-1];
    }
    arr[0]=last;
}
for(int i=0;i<n;i++){
    System.out.print(arr[i]+" ");}

}
}*/
//problem 2 >>>>find the duplicate in an array

/*public class dsa {
    public static void main(String[] args) {
        int n;
        Scanner sc=new Scanner(System.in);
        n=sc.nextInt();
        int arr[]=new int[n];
        for(int i=0;i<n;i++){
            arr[i]=sc.nextInt();
        }
        // Logic to find duplicate can be added here

for(int i=0;i<n;i++){   
    for(int j=0;j<n;j++){
        
        if(i!=j && arr[i]==arr[j]){
            System.out.println("Duplicate element is: "+arr[i]);
            break;
        }
    }
}}






    
}*/
    
//problem 3 >>>>find the missing number in an array
/*public class dsa {
    public static void main(String[] args) {
        int n;
        Scanner sc=new Scanner(System.in);
        n=sc.nextInt();
        int arr[]=new int[n];
        for(int i=0;i<n;i++){
            arr[i]=sc.nextInt();
        }
        // Logic to find missing number can be added here
        for(int i=0;i<n;i++){
            if(arr[i]!=i){
                System.out.println("Missing number is: "+i);
                break;
            }
        }
    }
}*/
//problem 4 >>>>find the largest sum contiguous subarray
public class dsa {
    public static void main(String[] args) {
        int n;
        Scanner sc=new Scanner(System.in);
        n=sc.nextInt();
        int arr[]=new int[n];
        int brr[]=new int[n];
        for(int i=0;i<n;i++){
            arr[i]=sc.nextInt();
        }
        // Logic to find largest sum contiguous subarray can be added here
        for(int i=0;i<n;i++){
            for(int j=i;j<n;j++){
                int sum=0;
                for(int k=i;k<=j;k++){
                    sum+=arr[k];
                }
                brr[i]=sum;
                System.out.println("Sum of subarray from index "+i+" to "+j+" is: "+sum);
            }
        }






    }}