#include <iostream>
using namespace std;

int main()
{
    int score;
    int count = 0;
    int sum = 0;

    do
    {
        cout << "Enter a score (-1 to stop): ";
        cin >> score;
        cout << endl;

        if (score == -1)
            break;

        if (score < 0 || score > 100)
        {
            cout << "Invalid score! Try again." << endl;
            cout << endl;
        }
        else
        {
            sum += score;
            count++;
        }

    } while (true);

    if (count > 0)
    {
        double average = (double)sum / count;

        cout << "You entered " << count << " valid scores." << endl;
        cout << endl;
        cout << "Average score = " << average << endl;
    }
    else
    {
        cout << "You entered 0 valid scores." << endl;
    }

    return 0;
}